// Lambda Handler: getGroup
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

  if (!groupId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing groupId" }) };
  }

  try {
    const pool = await getPool();

    // Fetch group details + creator name
    const [rows] = await pool.execute(`
      SELECT g.id, g.name, g.type, g.budget, g.created_by, u.name as created_by_name, g.created_at
      FROM \`groups\` g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.id = ?
    `, [groupId]);

    if (rows.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Group not found" }) };
    }

    // Return the single group object directly
    return { statusCode: 200, headers, body: JSON.stringify(rows[0]) };

  } catch (err) {
    console.error("getGroup Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};