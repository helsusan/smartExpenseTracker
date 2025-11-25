// FILE: index.js
// CHANGED: Single Lambda to handle /groups/list, /categories/search, /expense/add
const mysql = require('mysql2/promise');

let pool = null;

async function getPool() {
  if (pool) return pool;
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    // optionally set timezone etc
  };
  pool = mysql.createPool(config);
  return pool;
}

function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // CHANGED: use specific origin in prod
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  const path = event.path || '/';
  try {
    const pool = await getPool();

    // ROUTING: YOU MAY USE BASE PATH /prod in API Gateway; we match suffixes
    if (path.endsWith('/groups/list') && event.httpMethod === 'GET') {
      // GET /groups/list?user_id=3
      const user_id = (event.queryStringParameters && parseInt(event.queryStringParameters.user_id)) || 0;
      if (!user_id) return buildResponse(200, []);
      const [rows] = await pool.execute(
        `SELECT g.id, g.name FROM \`groups\` g
         INNER JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? AND gm.status = 'active'`, [user_id]);
      return buildResponse(200, rows);
    }

    if (path.endsWith('/categories/search') && event.httpMethod === 'POST') {
      // POST { search, user_id }
      const payload = JSON.parse(event.body || '{}');
      const search = payload.search ? `%${payload.search}%` : '%';
      const user_id = payload.user_id || 0;
      // Query categories (public or user-specific)
      const [rows] = await pool.execute(
        `SELECT * FROM categories WHERE (user_id IS NULL OR user_id = ?) AND name LIKE ? ORDER BY name LIMIT 10`,
        [user_id, search]
      );
      return buildResponse(200, { success: true, categories: rows });
    }

    if (path.endsWith('/expense/add') && event.httpMethod === 'POST') {
      // Add expense: parse JSON body and insert transaction, items, summary, groups
      const data = JSON.parse(event.body || '{}');

      // Basic validation
      const user_id = parseInt(data.user_id) || 0;
      const name = (data.expense_name || '').trim();
      const amount = parseFloat(data.grand_total) || 0;
      const date = data.transaction_date || null;
      if (!user_id || !name || !date || amount <= 0) {
        return buildResponse(400, { success: false, message: 'Missing required fields' });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Handle category: create if provided and not exists
        let category_id = null;
        if (data.category_name && data.category_name.trim() !== '') {
          const catName = data.category_name.trim();
          const [existing] = await conn.execute(`SELECT id FROM categories WHERE name = ? AND (user_id IS NULL OR user_id = ?) LIMIT 1`, [catName, user_id]);
          if (existing && existing.length > 0) {
            category_id = existing[0].id;
          } else {
            const [r] = await conn.execute(`INSERT INTO categories (user_id, name) VALUES (?, ?)`, [user_id, catName]);
            category_id = r.insertId;
          }
        }

        // insert transaction
        const [tRes] = await conn.execute(
          `INSERT INTO transactions (user_id, category_id, type, name, amount, date, payment_method, created_at, updated_at) VALUES (?, ?, 'Expense', ?, ?, ?, ?, NOW(), NOW())`,
          [user_id, category_id, name, amount, date, data.payment_method || null]
        );
        const transaction_id = tRes.insertId;

        // insert items
        if (Array.isArray(data.items) && data.items.length > 0) {
          const itemStmt = `INSERT INTO transaction_items (transaction_id, item_name, quantity, unit_price, subtotal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`;
          for (const item of data.items) {
            const itemName = item.name || '';
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            if (!itemName || quantity <= 0) continue;
            const subtotal = quantity * price;
            await conn.execute(itemStmt, [transaction_id, itemName, quantity, price, subtotal]);
          }
        }

        // insert summary
        await conn.execute(
          `INSERT INTO transaction_summary (transaction_id, subtotal, tax, service_charge, discount, grand_total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [transaction_id, parseFloat(data.subtotal) || 0, parseFloat(data.tax) || 0, parseFloat(data.service_charge) || 0, parseFloat(data.discount) || 0, amount]
        );

        // insert groups
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          const gStmt = `INSERT INTO transaction_groups (transaction_id, group_id, added_at, updated_at) VALUES (?, ?, NOW(), NOW())`;
          for (const g of data.groups) {
            await conn.execute(gStmt, [transaction_id, parseInt(g)]);
          }
        }

        await conn.commit();
        conn.release();
        return buildResponse(200, { success: true, transaction_id });
      } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('DB error', err);
        return buildResponse(500, { success: false, message: err.message });
      }
    }

    // default: not found
    return buildResponse(404, { message: 'Not found' });

  } catch (err) {
    console.error('Handler error', err);
    return buildResponse(500, { message: err.message });
  }
};
