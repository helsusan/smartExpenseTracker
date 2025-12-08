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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const qs = event.queryStringParameters || {};
  const groupId = qs.groupId;
  const userId = qs.userId; // Penting untuk validasi keamanan

  if (!groupId || !userId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing groupId or userId" }) };
  }

  try {
    const pool = await getPool();

    // 1. CEK KEAMANAN: Apakah user ini benar-benar anggota grup tersebut?
    const [membership] = await pool.execute(
      `SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`, 
      [groupId, userId]
    );

    if (membership.length === 0) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Access Denied: You are not a member of this group." }) };
    }

    // 2. AMBIL INFO GRUP
    const [groupInfo] = await pool.execute(
      `SELECT id, name, type, budget, created_at FROM \`groups\` WHERE id = ?`, 
      [groupId]
    );

    if (groupInfo.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Group not found" }) };
    }

    // 3. HITUNG TOTAL PENGELUARAN GRUP
    // Menggabungkan tabel transactions dan transaction_groups
    const [expenseStats] = await pool.execute(`
      SELECT COALESCE(SUM(t.amount), 0) as total_expense
      FROM transactions t
      JOIN transaction_groups tg ON t.id = tg.transaction_id
      WHERE tg.group_id = ? AND t.type = 'Expense'
    `, [groupId]);

    const totalExpense = Number(expenseStats[0].total_expense);
    const budget = Number(groupInfo[0].budget);
    const remaining = budget - totalExpense;
    const percentage = budget > 0 ? (totalExpense / budget) * 100 : 0;

    // 4. AMBIL DAFTAR ANGGOTA
    const [members] = await pool.execute(`
      SELECT u.id, u.name, u.email, gm.role, gm.joined_at
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY gm.role ASC, u.name ASC
    `, [groupId]);

    // 5. GABUNGKAN DATA RESPONSE
    const responseData = {
      info: groupInfo[0],
      stats: {
        total_expense: totalExpense,
        remaining_budget: remaining,
        percentage_used: percentage
      },
      members: members,
      current_user_role: membership[0].role
    };

    return { statusCode: 200, headers, body: JSON.stringify(responseData) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};