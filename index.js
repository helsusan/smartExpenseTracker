// index.js
const mysql = require('mysql2/promise');

let pool = null;

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
  // OPTIONS CORS
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
    // AUTH ROUTES
    // =============================

    // POST /api/auth/login
    if (path.endsWith('/api/auth/login') && method === 'POST') {
      const { email, password } = body;

      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      if (!rows.length || rows[0].password !== password) {
        return buildResponse(400, {
          success: false,
          message: 'Invalid credentials'
        });
      }

      const user = rows[0];
      return buildResponse(200, {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    }

    // POST /api/auth/signup
    if (path.endsWith('/api/auth/signup') && method === 'POST') {
      const { name, email, password, budget } = body;

      const [check] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (check.length > 0) {
        return buildResponse(400, {
          success: false,
          message: 'Email already registered'
        });
      }

      await pool.execute(
        'INSERT INTO users (name,email,password,budget,created_at) VALUES (?,?,?,?,NOW())',
        [name, email, password, budget]
      );

      return buildResponse(200, {
        success: true,
        message: 'Account created'
      });
    }

    // =============================
    // USERS ROUTE
    // =============================
    if (path.endsWith('/api/users/list') && method === 'GET') {
      const ex = event.queryStringParameters &&
        parseInt(event.queryStringParameters.exclude_user_id);

      let rows;
      if (ex) {
        [rows] = await pool.execute(
          'SELECT id,name,email FROM users WHERE id != ?',
          [ex]
        );
      } else {
        [rows] = await pool.execute(
          'SELECT id,name,email FROM users'
        );
      }

      return buildResponse(200, rows);
    }

    // =============================
    // GROUP LIST
    // =============================
    if (path.endsWith('/api/groups/list') && method === 'GET') {
      const user_id = event.queryStringParameters &&
        parseInt(event.queryStringParameters.user_id);

      if (!user_id) return buildResponse(200, []);

      const [rows] = await pool.execute(
        `SELECT g.id, g.name FROM \`groups\` g
         INNER JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? AND gm.status = 'active'`,
        [user_id]
      );
      return buildResponse(200, rows);
    }

    // =============================
    // GROUP CREATE
    // =============================
    if (path.endsWith('/api/groups/create') && method === 'POST') {
      const { creator_id, group_name, group_type, group_budget, participants } = body;

      if (!creator_id || !group_name || !group_type) {
        return buildResponse(400, {
          success: false,
          message: 'Missing required fields'
        });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [gRes] = await conn.execute(
          `INSERT INTO \`groups\`
          (name, created_by, type, budget, created_at)
          VALUES (?,?,?,?,NOW())`,
          [group_name, creator_id, group_type, group_budget]
        );

        const new_group_id = gRes.insertId;

        await conn.execute(
          `INSERT INTO group_members
            (group_id,user_id,role,status,joined_at)
           VALUES (?,?, 'Admin','Active',NOW())`,
          [new_group_id, creator_id]
        );

        if (Array.isArray(participants)) {
          const findUser = 'SELECT id FROM users WHERE email = ? LIMIT 1';
          const addMember = `INSERT INTO group_members
            (group_id,user_id,role,status,joined_at)
            VALUES (?,?, 'Member','Active',NOW())`;

          for (const email of participants) {
            const [u] = await conn.execute(findUser, [email]);
            if (u.length > 0) {
              await conn.execute(addMember, [new_group_id, u[0].id]);
            }
          }
        }

        await conn.commit();
        conn.release();
        return buildResponse(200, { success: true, group_id: new_group_id });

      } catch (err) {
        await conn.rollback();
        conn.release();
        return buildResponse(500, { success:false, message: err.message });
      }
    }

    // =============================
    // CATEGORY SEARCH
    // =============================
    if (path.endsWith('/api/categories/search') && method === 'POST') {
      const search = body.search ? `%${body.search}%` : '%';
      const user_id = body.user_id || 0;

      const [rows] = await pool.execute(
        `SELECT * FROM categories
         WHERE (user_id IS NULL OR user_id = ?)
         AND name LIKE ? ORDER BY name LIMIT 10`,
        [user_id, search]
      );
      return buildResponse(200, { success: true, categories: rows });
    }

    // =============================
    // ADD EXPENSE
    // =============================
    if (path.endsWith('/api/expense/add') && method === 'POST') {
      const data = body;
      const user_id = parseInt(data.user_id);

      if (!user_id || !data.expense_name) {
        return buildResponse(400, {
          success: false,
          message: 'Missing required fields'
        });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        let category_id = null;

        if (data.category_name?.trim()) {
          const [row] = await conn.execute(
            `SELECT id FROM categories WHERE name=? AND (user_id IS NULL OR user_id=?) LIMIT 1`,
            [data.category_name, user_id]
          );
          if (row.length) {
            category_id = row[0].id;
          } else {
            const [r] = await conn.execute(
              `INSERT INTO categories (user_id,name) VALUES (?,?)`,
              [user_id, data.category_name]
            );
            category_id = r.insertId;
          }
        }

        const [t] = await conn.execute(
          `INSERT INTO transactions
            (user_id,category_id,type,name,amount,date,payment_method,created_at,updated_at)
           VALUES (?,?, 'Expense',?,?,?,?,NOW(),NOW())`,
          [
            user_id,
            category_id,
            data.expense_name,
            data.grand_total,
            data.transaction_date,
            data.payment_method
          ]
        );

        const tId = t.insertId;

        await conn.execute(
          `INSERT INTO transaction_summary
          (transaction_id,subtotal,tax,service_charge,discount,grand_total,created_at,updated_at)
           VALUES (?,?,?,?,?,?,NOW(),NOW())`,
          [
            tId,
            data.subtotal,
            data.tax,
            data.service_charge,
            data.discount,
            data.grand_total
          ]
        );

        await conn.commit();
        conn.release();

        return buildResponse(200, { success:true, transaction_id: tId });

      } catch (err) {
        await conn.rollback();
        conn.release();
        return buildResponse(500, { success:false, message: err.message });
      }
    }

    return buildResponse(404, { message: 'Not found' });

  } catch (err) {
    return buildResponse(500, { message: err.message });
  }
};
