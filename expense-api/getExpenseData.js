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
    // GROUP LIST
    // =============================
    if (path.endsWith('/groups/list') && method === 'GET') {
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
    // CATEGORY SEARCH
    // =============================
    if (path.endsWith('/categories/search') && method === 'POST') {
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
    if (path.endsWith('/expense/add') && method === 'POST') {
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

        if (Array.isArray(data.items)) {
          for (const item of data.items) {
            await conn.execute(
              `INSERT INTO transaction_items
                (transaction_id, item_name, quantity, unit_price, subtotal, status, created_at, updated_at)
              VALUES (?,?,?,?,?,NULL,NOW(),NOW())`,
              [
                tId,
                item.name,
                item.quantity,
                item.price,
                (item.quantity || 0) * (item.price || 0)
              ]
            );
          }
        }

        if (Array.isArray(data.groups) && data.groups.length > 0) {
          for (const groupId of data.groups) {
            await conn.execute(
              `INSERT INTO transaction_groups (transaction_id, group_id) VALUES (?, ?)`,
              [transactionId, groupId]
            );
          }
        }

        await conn.commit();
        conn.release();

        return buildResponse(200, { success:true, transaction_id: tId });

      } catch (err) {
        await conn.rollback();
        conn.release();
        return buildResponse(500, { success:false, message: err.message });
      }
    }

    // =============================
    // CHECK SCAN RESULT (GET /api/check-scan)
    // =============================
    if (path.endsWith('/upload/check-scan') && method === 'GET') {
      const key = event.queryStringParameters.key; // Nama file di folder outbox
      const bucketName = "smart-expense-receipts"; // GANTI NAMA BUCKET ANDA

      if (!key) return buildResponse(400, { message: "Missing key" });

      try {
        const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
        const s3 = new S3Client();

        // Coba ambil file JSON dari S3
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key
        });
        
        const response = await s3.send(command);
        // Baca isi file
        const str = await response.Body.transformToString();
        const json = JSON.parse(str);

        return buildResponse(200, json);

      } catch (err) {
        // Jika errornya "NoSuchKey", berarti file belum jadi (sedang diproses)
        if (err.name === 'NoSuchKey') {
            return buildResponse(404, { status: "processing", message: "File not ready yet" });
        }
        console.error(err);
        return buildResponse(500, { message: err.message });
      }
    }

    return buildResponse(404, { message: 'Not found' });

  } catch (err) {
    return buildResponse(500, { message: err.message });
  }
};

