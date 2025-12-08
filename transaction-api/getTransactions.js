// getTransactions.js
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


function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    },
    body: JSON.stringify(body)
  };
}


exports.handler = async (event) => {
  // Allow CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse(204, '');
  }

  try {
    const qs = event.queryStringParameters || {};
    const user_id = parseInt(qs.user_id) || 0;
    const start_date = qs.start_date || null;
    const end_date = qs.end_date || null;

    if (!user_id || !start_date || !end_date) {
      // Return 400 to indicate missing params
      return buildResponse(400, { message: 'Missing required query params: user_id, start_date, end_date' });
    }

    const pool = await getPool();
    const [rows] = await pool.execute(
      `SELECT
         t.id, t.date, t.type, t.name, t.amount, t.payment_method,
         c.name AS category, g.name AS group_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN transaction_groups tg ON t.id = tg.transaction_id
       LEFT JOIN group_name g ON tg.group_id = g.id
       WHERE t.user_id = ? AND t.date BETWEEN ? AND ?
       ORDER BY t.date DESC`,
      [user_id, start_date, end_date]
    );

    // rows is array of transactions (may contain duplicates if multiple groups; same as original PHP)
    return buildResponse(200, rows);
  } catch (err) {
    console.error(err);
    return buildResponse(500, { message: err.message });
  }
};
