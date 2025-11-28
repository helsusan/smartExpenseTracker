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
    // UPLOAD RECEIPT (POST /api/upload)
    // =============================
    if (path.endsWith('/upload') && method === 'POST') {
      const { image, filename } = body; // image = base64 string
      const bucketName = "smart-expense-receipts"; // GANTI dengan nama bucket Anda
      
      // Bersihkan header base64 jika ada
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Simpan ke folder 'inbox'
      const key = `inbox/${Date.now()}_${filename}`;

      try {
        const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
        const s3 = new S3Client(); // Region default Lambda
        
        await s3.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: 'image/jpg' // Atau sesuaikan
        }));

        return buildResponse(200, { success: true, key: key });
      } catch (err) {
        console.error(err);
        return buildResponse(500, { message: "Upload failed: " + err.message });
      }
    }
} catch (err) {
    return buildResponse(500, { message: err.message });
  }
};
