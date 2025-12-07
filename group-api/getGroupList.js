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

  const userId = event.queryStringParameters?.userId;

  if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing userId" }) };

  try {
    const pool = await getPool();
    // Query mengambil grup dimana user terdaftar sebagai member/admin
    const [rows] = await pool.execute(`
      SELECT g.id, g.name 
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY g.created_at DESC
    `, [userId]);

    return { statusCode: 200, headers, body: JSON.stringify(rows) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};