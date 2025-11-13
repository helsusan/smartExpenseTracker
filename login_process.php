<?php
session_start();
require 'db_config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    $email = trim($_POST['email']);
    $password = $_POST['password'];

    // Validasi Input Kosong
    if (empty($email) || empty($password)) {
        header("Location: login.php?error=Email and Password are required!");
        exit;
    }

    try {
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Cek Password
            if ($password === $user['password']) {
                
                // Login Sukses
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_name'] = $user['name'];
                $_SESSION['user_email'] = $user['email'];

                header("Location: Dashboard.php");
                exit;

            } else {
                // Password Salah
                header("Location: login.php?error=Incorrect password!");
                exit;
            }
        } else {
            // Email Tidak Ditemukan
            header("Location: login.php?error=Email not registered!");
            exit;
        }

    } catch (PDOException $e) {
        header("Location: login.php?error=System error occurred.");
        exit;
    }
} else {
    header("Location: login.php");
    exit;
}
?>