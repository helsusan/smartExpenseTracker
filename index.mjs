import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import mysql from "mysql2/promise";
import ExcelJS from "exceljs";

const s3 = new S3Client({ region: "us-east-1" });
const sns = new SNSClient({ region: "us-east-1" });
const BUCKET_NAME = "smart-expense-reports";

export const handler = async () => {

  // ================================
  // A. MODE TESTING (HARD CODE)
  // ================================
  // const TEST_MONTH = 10;
  // const TEST_YEAR = 2025;
  
  // ================================
  // A. Lambda dijalankan setiap akhir bulan
  // ================================
  const now = new Date();
  const REPORT_MONTH = now.getMonth() + 1; // 1–12
  const REPORT_YEAR = now.getFullYear();

  let connection;

  try {
    // ================================
    // B. Connect ke MySQL
    // ================================
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    // ================================
    // C. Ambil user yang sudah punya TOPIC ARN
    // ================================
    const [users] = await connection.execute(`
      SELECT id, name, email, sns_topic_arn
      FROM users
      WHERE sns_topic_arn IS NOT NULL
    `);

    for (const user of users) {
      const userId = user.id;
      const userName = user.name || "User";
      const topicArn = user.sns_topic_arn;

      if (!topicArn) {
        console.log(`User ${userId} tidak punya topic ARN. Lewati.`);
        continue;
      }

      // ================================
      // D. Query transaksi bulan tertentu
      // ================================
      const [rows] = await connection.execute(`
        SELECT 
          t.id AS transaction_id,
          t.date,
          t.type,
          t.name,
          c.name AS category,
          g.name AS group_name,
          t.payment_method,
          s.tax,
          s.service_charge,
          s.discount,
          t.amount,
          i.item_name,
          i.quantity,
          i.unit_price,
          i.subtotal
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN transaction_summary s ON t.id = s.transaction_id
        LEFT JOIN transaction_items i ON t.id = i.transaction_id
        LEFT JOIN transaction_groups tg ON t.id = tg.transaction_id
        LEFT JOIN \`groups\` g ON tg.group_id = g.id
        WHERE t.user_id = ?
          AND MONTH(t.date) = ?
          AND YEAR(t.date) = ?
        ORDER BY t.date, t.id, i.id
      `, [
        userId,
        // TEST_MONTH ?? new Date().getMonth() + 1,
        // TEST_YEAR ?? new Date().getFullYear()
        REPORT_MONTH,
        REPORT_YEAR
      ]);

      if (rows.length === 0) {
        console.log(`User ${userId} tidak punya transaksi pada periode test`);
        continue;
      }

      // ================================
      // E. Tentukan nama bulan & tahun
      // ================================
      const periodMonthName = new Date(
        // TEST_YEAR,
        // TEST_MONTH - 1,
        REPORT_YEAR,
        REPORT_MONTH - 1,
        1
      ).toLocaleString("default", { month: "long" });

      // const periodYear = TEST_YEAR;
      const periodYear = REPORT_YEAR;

      // ================================
      // F. Generate Excel laporan
      // ================================
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Report");

      sheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Type", key: "type", width: 12 },
        { header: "Name", key: "name", width: 25 },
        { header: "Category", key: "category", width: 15 },
        { header: "Group", key: "group", width: 20 },
        { header: "Payment Method", key: "payment", width: 15 },
        { header: "Tax", key: "tax", width: 10 },
        { header: "Service Charge", key: "sc", width: 15 },
        { header: "Discount", key: "discount", width: 10 },
        { header: "Grand Total", key: "gt", width: 15 },
        { header: "Item Name", key: "item", width: 25 },
        { header: "Quantity", key: "qty", width: 10 },
        { header: "Unit Price", key: "unit", width: 15 },
        { header: "Subtotal", key: "sub", width: 15 }
      ];

      let lastTxn = null;

      for (const r of rows) {
        const d = new Date(r.date).toLocaleDateString("en-GB");

        if (r.transaction_id !== lastTxn) {
          sheet.addRow({
            date: d,
            type: r.type,
            name: r.name,
            category: r.category,
            group: r.group_name,
            payment: r.payment_method,
            tax: r.tax,
            sc: r.service_charge,
            discount: r.discount,
            gt: r.amount,
            item: r.item_name,
            qty: r.quantity,
            unit: r.unit_price,
            sub: r.subtotal
          });
        } else {
          sheet.addRow({
            item: r.item_name,
            qty: r.quantity,
            unit: r.unit_price,
            sub: r.subtotal
          });
        }

        lastTxn = r.transaction_id;
      }

      const buffer = await workbook.xlsx.writeBuffer();

      // ================================
      // G. Upload ke S3
      // ================================
      const fileKey = `reports/user_${userId}/${periodYear}_${periodMonthName}.xlsx`;

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }));

      const downloadUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;

      // ================================
      // H. Kirim email via SNS (TOPIC ARN)
      // ================================
      const message = `
Halo ${userName},

Laporan transaksi Anda untuk periode ${periodMonthName} ${periodYear} sudah siap.

Silakan download melalui link berikut:
${downloadUrl}
      `;

      await sns.send(new PublishCommand({
        TopicArn: topicArn,
        Message: message,
        Subject: `Smart Expense Monthly Report - ${periodMonthName} ${periodYear}`
      }));

      console.log(`Laporan terkirim ke SNS Topic: ${topicArn}`);
    }

    return { statusCode: 200, body: "Monthly reports sent via SNS topic (TEST MODE)" };

  } catch (err) {
    console.log(err);
    return { statusCode: 500, body: err.message };
  }
};