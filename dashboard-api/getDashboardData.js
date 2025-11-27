// getDashboardData.js
// Lambda handler for GET /dashboard?userId=...&month=...&year=...
// Requires env: DB_HOST, DB_USER, DB_PASS, DB_NAME
const mysql = require('mysql2/promise');

let pool; // reuse across invocations (Lambda warm)

async function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });
  return pool;
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      // You should change this in production to the exact S3 origin (https://<bucket>.s3-website-...)
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return respond(204, {});
  }

  const qs = event.queryStringParameters || {};
  const userId = Number(qs.userId || qs.user_id || 0);
  const month = Number(qs.month || new Date().getMonth()+1);
  const year = Number(qs.year || new Date().getFullYear());

  if (!userId) return respond(400, { error: "Missing userId" });

  try {
    const pool = await getPool();

    // fetch user basic info (optional)
    const [userRows] = await pool.execute('SELECT id,name,budget FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = userRows[0] || { id: userId, name: null, budget: 15000000 };

    // total income
    const [incomeRows] = await pool.execute(`
      SELECT COALESCE(SUM(amount),0) AS total_income
      FROM transactions
      WHERE user_id = ? AND type = 'Income' AND MONTH(date) = ? AND YEAR(date) = ?
    `, [userId, month, year]);

    // total expense
    const [expenseRows] = await pool.execute(`
      SELECT COALESCE(SUM(amount),0) AS total_expense
      FROM transactions
      WHERE user_id = ? AND type = 'Expense' AND MONTH(date) = ? AND YEAR(date) = ?
    `, [userId, month, year]);

    const total_income = Number(incomeRows[0].total_income || 0);
    const total_expense = Number(expenseRows[0].total_expense || 0);
    const balance = total_income - total_expense;

    // budget (use user's budget if exists)
    const budget = Number(user.budget || process.env.DEFAULT_BUDGET || 15000000);
    const remaining = budget - total_expense;
    const percentage_used = budget > 0 ? (total_expense / budget) * 100 : 0;

    // category data (pie)
    const [categoryRows] = await pool.execute(`
      SELECT c.name AS category_name, COALESCE(SUM(t.amount),0) AS total_expense
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'Expense' AND MONTH(t.date) = ? AND YEAR(t.date) = ?
      GROUP BY c.name
    `, [userId, month, year]);

    // daily data
    const [dailyRows] = await pool.execute(`
      SELECT DATE(date) AS day, COALESCE(SUM(amount),0) AS total
      FROM transactions
      WHERE user_id = ? AND type = 'Expense' AND MONTH(date) = ? AND YEAR(date) = ?
      GROUP BY DATE(date)
      ORDER BY day ASC
    `, [userId, month, year]);

    // monthly money flow
    const [moneyFlowRows] = await pool.execute(`
      SELECT MONTH(date) AS month_num, DATE_FORMAT(date,'%b') AS month,
        COALESCE(SUM(CASE WHEN type='Income' THEN amount ELSE 0 END),0) AS total_income,
        COALESCE(SUM(CASE WHEN type='Expense' THEN amount ELSE 0 END),0) AS total_expense
      FROM transactions
      WHERE user_id = ? AND YEAR(date) = ?
      GROUP BY MONTH(date), DATE_FORMAT(date,'%b')
      ORDER BY MONTH(date)
    `, [userId, year]);

    return respond(200, {
      user_id: user.id,
      user_name: user.name,
      total_income,
      total_expense,
      balance,
      budget,
      remaining,
      percentage_used,
      category_data: categoryRows,
      daily_data: dailyRows,
      money_flow: moneyFlowRows
    });

  } catch (err) {
    console.error('Error in Lambda getDashboardData:', err);
    return respond(500, { error: 'Internal server error', details: err.message });
  }
};
