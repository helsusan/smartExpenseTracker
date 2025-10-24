<?php
// Import koneksi dari file db_config.php
include 'db_config.php';

// Query ambil data user
$sql = "SELECT id, name, email FROM users";
$result = $conn->query($sql);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Data Users</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
    }
    table {
      width: 60%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
  </style>
</head>
<body>
  <h2>Home</h2>
</body>
</html>
<?php
$conn->close();
?>
