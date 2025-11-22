<?php
$host = "smart-expense-db.cf07zalhg4f6.us-east-1.rds.amazonaws.com";
$dbname = "expense_tracker";
$user = "admin";
$pass = "CutieDucky777*";

try {
    $db = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Koneksi database gagal: " . $e->getMessage());
}
?>
