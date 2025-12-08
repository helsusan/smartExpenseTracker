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
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const body = JSON.parse(event.body || '{}');
  const { userId, group_name, group_type, group_budget, participants } = body;

  if (!userId || !group_name) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  let connection;
  try {
    const pool = await getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // PERBAIKAN: Menambahkan backticks (`) di sekitar nama tabel groups
    const [resGroup] = await connection.execute(
      `INSERT INTO \`groups\` (name, created_by, type, budget, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [group_name, userId, group_type, group_budget || 0]
    );
    const newGroupId = resGroup.insertId;

    // 2. Insert Admin (Creator)
    await connection.execute(
      `INSERT INTO group_members (group_id, user_id, role, status, joined_at) VALUES (?, ?, 'Admin', 'Active', NOW())`,
      [newGroupId, userId]
    );

    // 3. Insert Participants
    if (participants && participants.length > 0) {
      const emailList = Array.isArray(participants) ? participants : participants.split(',');
      
      for (const email of emailList) {
        const cleanEmail = email.trim();
        const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        
        if (users.length > 0 && users[0].id != userId) {
          await connection.execute(
            `INSERT INTO group_members (group_id, user_id, role, status, joined_at) VALUES (?, ?, 'Member', 'Active', NOW())`,
            [newGroupId, users[0].id]
          );
        }
      }
    }

    await connection.commit();
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, groupId: newGroupId }) };

  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  } finally {
    if (connection) connection.release();
  }
};