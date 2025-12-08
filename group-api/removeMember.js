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
  const { userId, groupId, memberUserId } = body; // userId is the requester (admin), memberUserId is target

  if (!userId || !groupId || !memberUserId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  try {
    const pool = await getPool();

    // 1. Verify requester is Admin of this group
    const [requester] = await pool.execute(
      `SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'Active'`,
      [groupId, userId]
    );

    if (requester.length === 0 || requester[0].role !== 'Admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Only admins can remove members." }) };
    }

    // 2. Prevent removing self (Admin cannot remove themselves this way, usually)
    if (String(userId) === String(memberUserId)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Cannot remove yourself." }) };
    }

    // 3. Update target member status to 'Removed'
    // We update instead of delete to keep transaction history valid
    const [result] = await pool.execute(
      `UPDATE group_members SET status = 'Removed' WHERE group_id = ? AND user_id = ?`,
      [groupId, memberUserId]
    );

    if (result.affectedRows === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Member not found in group." }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error("removeMember Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};