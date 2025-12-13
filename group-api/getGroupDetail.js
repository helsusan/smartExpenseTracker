const mysql = require('mysql2/promise');

let pool;
async function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5
  });
  return pool;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const qs = event.queryStringParameters || {};
  let groupId = Number(qs.groupId);
  let userId = Number(qs.userId);

  // Cek apakah parameter bulan/tahun dikirim secara eksplisit oleh Frontend
  const hasDateFilter = qs.month && qs.year;

  // Jika ada filter, gunakan. Jika tidak, pakai waktu sekarang sebagai fallback sementara
  let month = Number(qs.month || new Date().getMonth() + 1);
  let year = Number(qs.year || new Date().getFullYear());

  if (!Number.isFinite(groupId) || !Number.isFinite(userId)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid groupId or userId" }) };
  }

  try {
    const pool = await getPool();

    // ============================
    // 1. CEK STATUS MEMBER & AMBIL INFO GROUP DULUAN
    // ============================
    // Kita perlu info group dulu untuk tahu Type-nya (Regular / One Time)
    const [membership] = await pool.execute(
      `SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'Active'`,
      [groupId, userId]
    );

    if (membership.length === 0) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Access Denied" }) };
    }
    const currentUserRole = membership[0].role;

    const [groupInfo] = await pool.execute(
      `SELECT name, type, budget, created_at FROM \`groups\` WHERE id = ?`,
      [groupId]
    );

    if (!groupInfo.length) return { statusCode: 404, headers, body: JSON.stringify({ error: "Group not found" }) };
    const group = groupInfo[0];

    // ============================
    // 2. TENTUKAN LOGIKA FILTER WAKTU
    // ============================
    // Logic: 
    // - Jika user memilih tanggal di frontend (hasDateFilter true) -> Filter per bulan
    // - Jika user TIDAK milih tanggal DAN Group Type = 'Regular' -> Filter bulan ini (Default Regular)
    // - Jika user TIDAK milih tanggal DAN Group Type = 'One Time' -> AMBIL SEMUA (Default One Time)

    let isAllTime = false;
    let timeSql = "";
    let timeParams = [];

    if (hasDateFilter) {
      // User minta filter spesifik
      timeSql = " AND MONTH(t.date) = ? AND YEAR(t.date) = ? ";
      timeParams = [month, year];
    } else {
      if (group.type === 'One Time') {
        // Default One Time = All Data
        isAllTime = true;
        timeSql = ""; // Tidak ada filter waktu
        timeParams = [];
      } else {
        // Default Regular = Bulan Ini
        timeSql = " AND MONTH(t.date) = ? AND YEAR(t.date) = ? ";
        timeParams = [month, year];
      }
    }

    // ============================
    // 3. QUERY DATA (DENGAN DYNAMIC SQL)
    // ============================

    // a. Total Expense
    const [expenseRows] = await pool.execute(
      `SELECT COALESCE(SUM(t.amount), 0) AS total_expense
       FROM transactions t
       JOIN transaction_groups tg ON t.id = tg.transaction_id
       WHERE tg.group_id = ? AND t.type = 'Expense' ${timeSql}`,
      [groupId, ...timeParams]
    );

    // b. Chart: Expense by Category
    const [categoryRows] = await pool.execute(
      `SELECT c.name AS category_name, COALESCE(SUM(t.amount),0) AS total_expense
       FROM transactions t
       JOIN transaction_groups tg ON t.id = tg.transaction_id
       JOIN categories c ON t.category_id = c.id
       WHERE tg.group_id = ? AND t.type = 'Expense' ${timeSql}
       GROUP BY c.name`,
      [groupId, ...timeParams]
    );

    // c. Chart: Daily Expense / Trend
    // Jika All Time, kita group by Month-Year agar grafiknya tidak terlalu padat per hari, 
    // atau tetap per hari tapi range panjang. Di sini kita tetap per hari (DATE).
    const [dailyRows] = await pool.execute(
      `SELECT DATE(t.date) AS day, COALESCE(SUM(t.amount),0) AS total
       FROM transactions t
       JOIN transaction_groups tg ON t.id = tg.transaction_id
       WHERE tg.group_id = ? AND t.type = 'Expense' ${timeSql}
       GROUP BY DATE(t.date)
       ORDER BY day ASC`,
      [groupId, ...timeParams]
    );

    // d. Member Contribution
    const [contributionRows] = await pool.execute(
      `SELECT u.name, COALESCE(SUM(t.amount),0) AS total_spent
       FROM transactions t
       JOIN transaction_groups tg ON t.id = tg.transaction_id
       JOIN users u ON t.user_id = u.id
       WHERE tg.group_id = ? AND t.type = 'Expense' ${timeSql}
       GROUP BY u.name`,
      [groupId, ...timeParams]
    );

    // e. Members List (Tidak terpengaruh waktu)
    const [members] = await pool.execute(
      `SELECT u.id, u.name, u.email, gm.role, gm.joined_at
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = ? AND gm.status = 'Active'
       ORDER BY gm.role ASC, u.name ASC`,
      [groupId]
    );

    // ============================
    // 4. HITUNG BUDGET
    // ============================
    const total_expense = Number(expenseRows[0].total_expense);
    const budget = Number(group.budget);
    const remaining = budget - total_expense;
    const percentage_used = budget > 0 ? (total_expense / budget) * 100 : 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        info: {
          id: groupId,
          name: group.name,
          type: group.type,
          budget,
          created_at: group.created_at
        },
        view_state: isAllTime ? 'All Time' : `${month}-${year}`, // Info untuk frontend
        stats: {
          total_expense,
          remaining,
          percentage_used
        },
        charts: {
          category_data: categoryRows,
          daily_data: dailyRows,
          member_contribution: contributionRows
        },
        members,
        current_user_role: currentUserRole
      })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
