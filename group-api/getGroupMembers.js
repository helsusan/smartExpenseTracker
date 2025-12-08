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

  const groupId = event.queryStringParameters?.groupId;

  if (!groupId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing groupId" }) };

  try {
    const pool = await getPool();
    // Fetch members with status Active (or Removed if you want to show history)
    // Your frontend filters for display, but usually we just show Active members in the "Manage" list
    const [rows] = await pool.execute(`
      SELECT gm.user_id, u.name, u.email, gm.role, gm.status
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ? AND gm.status = 'Active'
      ORDER BY gm.role ASC, u.name ASC
    `, [groupId]);

    return { statusCode: 200, headers, body: JSON.stringify(rows) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};