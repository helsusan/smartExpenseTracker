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

  const excludeUserId = event.queryStringParameters?.excludeUserId || 0;

  try {
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT email FROM users WHERE id != ? ORDER BY email ASC', [excludeUserId]);
    return { statusCode: 200, headers, body: JSON.stringify(rows) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};