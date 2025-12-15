const mysql = require('mysql2/promise');

// Konfigurasi Database
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5
});

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
    // Handle Preflight Request (CORS)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { name, email, password, budget } = body;

        // 1. Validasi Input
        if (!name || !email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: "Missing required fields" })
            };
        }

        // 2. Simpan ke Database
        const connection = await pool.getConnection();
        try {
            // Cek apakah email sudah ada
            const [existingUser] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (existingUser.length > 0) {
                return {
                    statusCode: 409, // Conflict
                    headers,
                    body: JSON.stringify({ success: false, message: "Email already registered" })
                };
            }

            // Insert User Baru
            // Perhatikan: Kita memasukkan variabel 'password' langsung, bukan 'hashedPassword'
            const [result] = await connection.execute(
                'INSERT INTO users (name, email, password, budget) VALUES (?, ?, ?, ?)',
                [name, email, password, budget || 0]
            );

            return {
                statusCode: 201, // Created
                headers,
                body: JSON.stringify({ success: true, message: "User registered successfully", userId: result.insertId })
            };

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error("Signup Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: "Internal server error" })
        };
    }
};