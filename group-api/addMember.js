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
  const { userId, groupId, email } = body;

  if (!userId || !groupId || !email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  try {
    const pool = await getPool();

    // 1. Verify requester is Admin
    // (Optional: if regular members can invite, remove the role check)
    const [requester] = await pool.execute(
      `SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'Active'`,
      [groupId, userId]
    );
    if (requester.length === 0) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "You are not a member of this group." }) };
    }

    // 2. Find target user by email
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "User email not found." }) };
    }
    const targetUserId = users[0].id;

    // 3. Check existing membership
    const [existing] = await pool.execute(
      `SELECT id, status FROM group_members WHERE group_id = ? AND user_id = ?`,
      [groupId, targetUserId]
    );

    if (existing.length > 0) {
      const member = existing[0];
      if (member.status === 'Active') {
        return { statusCode: 409, headers, body: JSON.stringify({ error: "User is already an active member." }) };
      } else {
        // User was removed previously, reactivate them
        await pool.execute(
          `UPDATE group_members SET status = 'Active', role = 'Member' WHERE id = ?`,
          [member.id]
        );
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Member reactivated." }) };
      }
    } else {
      // 4. Insert new member
      await pool.execute(
        `INSERT INTO group_members (group_id, user_id, role, status, joined_at) VALUES (?, ?, 'Member', 'Active', NOW())`,
        [groupId, targetUserId]
      );
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Member added." }) };
    }

  } catch (err) {
    console.error("addMember Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};