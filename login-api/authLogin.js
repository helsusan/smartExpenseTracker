const mysql = require("mysql2/promise");

exports.handler = async (event) => {
    try {
        // Parse body
        const body = JSON.parse(event.body);
        const { email, password } = body;

        // Connect ke database
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        // Query user
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        // ---- USER NOT FOUND ----
        if (!rows.length) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": true
                },
                body: JSON.stringify({
                    success: false,
                    message: "Email not found"
                })
            };
        }

        const user = rows[0];

        // ---- WRONG PASSWORD ----
        if (user.password !== password) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": true
                },
                body: JSON.stringify({
                    success: false,
                    message: "Invalid password"
                })
            };
        }

        // ---- SUCCESS ----
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": true
            },
            body: JSON.stringify({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            })
        };

    } catch (err) {
        console.error("ERROR:", err);

        // ---- SERVER ERROR ----
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": true
            },
            body: JSON.stringify({
                success: false,
                message: "Server error"
            })
        };
    }
};
