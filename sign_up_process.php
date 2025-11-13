<?php
session_start();
require 'db_config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    $name = trim($_POST['name']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    $budget = $_POST['budget'];

    // Validasi Input Kosong
    if (empty($name) || empty($email) || empty($password) || empty($budget)) {
        header("Location: sign_up.php?error=Please fill in all fields!");
        exit;
    }

    // Validasi Password Match
    if ($password !== $confirm_password) {
        header("Location: sign_up.php?error=Passwords do not match!");
        exit;
    }

    try {
        // Cek Email Duplikat
        $stmt_check = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt_check->execute([$email]);
        
        if ($stmt_check->rowCount() > 0) {
            header("Location: sign_up.php?error=Email is already registered! Please use another one.");
            exit;
        }

        // Simpan User Baru
        $sql = "INSERT INTO users (name, email, password, budget, created_at) VALUES (?, ?, ?, ?, NOW())";
        $stmt = $db->prepare($sql);
        $stmt->execute([$name, $email, $password, $budget]);

        // Sukses -> Arahkan ke Login
        header("Location: login.php?success=Account created successfully! Please login.");
        exit;

    } catch (PDOException $e) {
        header("Location: sign_up.php?error=Failed to create account: " . $e->getMessage());
        exit;
    }
} else {
    header("Location: sign_up.php");
    exit;
}
?>