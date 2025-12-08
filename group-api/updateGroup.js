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
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const body = JSON.parse(event.body || '{}');
  const { userId, groupId, name, budget } = body;

  if (!userId || !groupId || !name) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  try {
    const pool = await getPool();

    // 1. Verify requester is Admin
    const [requester] = await pool.execute(
      `SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'Active'`,
      [groupId, userId]
    );

    if (requester.length === 0 || requester[0].role !== 'Admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Only admins can update group details." }) };
    }

    // 2. Update Group
    await pool.execute(
      `UPDATE \`groups\` SET name = ?, budget = ? WHERE id = ?`,
      [name, budget || 0, groupId]
    );

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error("updateGroup Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};