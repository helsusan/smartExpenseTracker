// getTransactionItems.js

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

function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*'
    },
    body: JSON.stringify(body)
  };
}


exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse(204, '');
  }

  try {
    const qs = event.queryStringParameters || {};
    const id = qs.id;
    if (!id) return buildResponse(400, { message: 'Missing id' });

    const pool = await getPool();
    const [rows] = await pool.execute(
      `SELECT item_name, quantity, unit_price, subtotal FROM transaction_items WHERE transaction_id = ?`,
      [id]
    );
    return buildResponse(200, rows);
  } catch (err) {
    console.error(err);
    return buildResponse(500, { message: err.message });
  }
};
