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

// Header CORS global
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*", // bisa diganti dengan domain frontend untuk keamanan
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Access-Control-Allow-Headers": "Content-Type"
};

exports.handler = async (event) => {
  console.log("Received event:", event);

  // Handle preflight request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Preflight OK" })
    };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON body" })
    };
  }

  const { userId, new_budget } = body;

  // Validate input
  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing userId" })
    };
  }

  if (new_budget === undefined || isNaN(new_budget) || Number(new_budget) < 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid budget value" })
    };
  }

  try {
    const pool = await getPool();
    const [result] = await pool.execute(
      "UPDATE users SET budget = ? WHERE id = ?",
      [Number(new_budget), userId]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, affectedRows: result.affectedRows })
    };
  } catch (err) {
    console.error("DB Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
