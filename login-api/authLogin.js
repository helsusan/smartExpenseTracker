import mysql from "mysql2/promise";

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const { email, password } = body;

        if (!email || !password) {
            return response(400, {
                success: false,
                message: "Email and password are required"
            });
        }

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const [rows] = await connection.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        await connection.end();

        if (rows.length === 0) {
            return response(404, {
                success: false,
                message: "Email not registered"
            });
        }

        const user = rows[0];

        // Password check — plain text (sesuai PHP-mu)
        if (password !== user.password) {
            return response(401, {
                success: false,
                message: "Incorrect password"
            });
        }

        return response(200, {
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        console.log(err);
        return response(500, {
            success: false,
            message: "System error occurred"
        });
    }
};

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body)
    };
}
