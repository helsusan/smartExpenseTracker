// income-api/getIncomeData.js
const mysql = require('mysql2/promise');

let pool = null;

// Menggunakan logic pool yang sama seperti di getExpenseData.js
async function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });
  return pool;
}

// Helper response standard
function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  // Handle CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse(204, {});
  }

  const path = event.path || '/';
  const method = event.httpMethod;

  let body = {};
  try { body = JSON.parse(event.body || '{}'); }
  catch(e){}

  try {
    const pool = await getPool();

    // =============================
    // GET GROUPS LIST
    // (Diadaptasi dari query fetch groups di income_form.php)
    // =============================
    if (path.endsWith('/groups/list') && method === 'GET') {
      const user_id = event.queryStringParameters &&
        parseInt(event.queryStringParameters.user_id);

      if (!user_id) return buildResponse(200, []);

      // Query mengambil grup dimana user aktif
      const [rows] = await pool.execute(
        `SELECT g.id, g.name FROM \`groups\` g
         INNER JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? AND gm.status = 'active'`,
        [user_id]
      );
      return buildResponse(200, rows);
    }

    // =============================
    // ADD INCOME
    // (Diadaptasi dari logika POST add_income di income_form.php)
    // =============================
    if (path.endsWith('/income/add') && method === 'POST') {
      const data = body;
      const user_id = parseInt(data.user_id);
      
      // Validasi input dasar
      if (!user_id || !data.income_name || !data.amount || !data.income_date) {
        return buildResponse(400, {
          success: false,
          message: 'Missing required fields'
        });
      }

      const amount = parseFloat(data.amount);
      if (amount <= 0) {
        return buildResponse(400, {
          success: false,
          message: 'Amount must be greater than 0'
        });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Insert ke tabel transactions
        // Note: category_id diset NULL untuk Income (sesuai income_form.php)
        // Type hardcoded 'Income'
        const [t] = await conn.execute(
          `INSERT INTO transactions
            (user_id, category_id, type, name, amount, date, payment_method, created_at, updated_at)
           VALUES (?, NULL, 'Income', ?, ?, ?, ?, NOW(), NOW())`,
          [
            user_id,
            data.income_name,
            amount,
            data.income_date,
            data.payment_method
          ]
        );

        const transactionId = t.insertId;

        // 2. Insert ke tabel transaction_groups (jika ada grup yang dipilih)
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          for (const groupId of data.groups) {
            await conn.execute(
              `INSERT INTO transaction_groups (transaction_id, group_id) VALUES (?, ?)`,
              [transactionId, groupId]
            );
          }
        }

        await conn.commit();
        conn.release();

        return buildResponse(200, { success: true, transaction_id: transactionId });

      } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("Database Error:", err);
        return buildResponse(500, { success: false, message: err.message });
      }
    }

    return buildResponse(404, { message: 'Endpoint not found' });

  } catch (err) {
    console.error("Handler Error:", err);
    return buildResponse(500, { message: err.message });
  }
};