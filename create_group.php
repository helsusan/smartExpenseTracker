<?php
session_start();
require 'db_config.php';

$_SESSION['user_id'] = 3;
$_SESSION['user_name'] = 'Aiko';
$_SESSION['user_email'] = 'c14220072@john.petra.ac.id';

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $group_name = trim($_POST['group_name']);
    $group_type = trim($_POST['group_type']);
    $group_budget = !empty($_POST['group_budget']) ? (float)$_POST['group_budget'] : 0;
    $creator_id = $_SESSION['user_id'];

    $participant_emails = [];
    if (!empty($_POST['participants'])) {
        $participant_emails = array_filter(array_map('trim', explode(',', $_POST['participants'])));
    }

    try {
        $db->beginTransaction();

        $stmt_group = $db->prepare("
            INSERT INTO `groups` (name, created_by, type, budget, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt_group->execute([$group_name, $creator_id, $group_type, $group_budget]);
        $new_group_id = $db->lastInsertId();

        // Tambahkan pembuat grup sebagai admin
        $stmt_admin = $db->prepare("
            INSERT INTO group_members (group_id, user_id, role, status, joined_at)
            VALUES (?, ?, 'Admin', 'Active', NOW())
        ");
        $stmt_admin->execute([$new_group_id, $creator_id]);

        // Tambahkan peserta lain
        if (!empty($participant_emails)) {
            $stmt_find_user = $db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt_add_member = $db->prepare("
                INSERT INTO group_members (group_id, user_id, role, status, joined_at)
                VALUES (?, ?, 'Member', 'Active', NOW())
            ");

            foreach ($participant_emails as $email) {
                if ($email === $_SESSION['user_email']) continue;
                $stmt_find_user->execute([$email]);
                $user = $stmt_find_user->fetch(PDO::FETCH_ASSOC);
                if ($user) {
                    $stmt_add_member->execute([$new_group_id, $user['id']]);
                }
            }
        }

        $db->commit();
        header("Location: create_group.php?success=1");
        exit;

    } catch (Exception $e) {
        $db->rollBack();
        header("Location: create_group.php?error=" . urlencode("Gagal: " . $e->getMessage()));
        exit;
    }
}

try {
    $stmt = $db->prepare("SELECT id, name, email FROM users WHERE id != ?");
    $stmt->execute([$_SESSION['user_id']]);
    $users_list = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $users_list = [];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Group - Smart Expense Tracker</title>

    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">
    <link rel="stylesheet" href="sidebar_group_style.css">

    <style>
        .navbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: var(--nav-bg);
            color: var(--nav-text);
            padding: 16px 5%;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .navbar-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #hamburger-btn {
            background: transparent;
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
        }

        #hamburger-btn .material-icons-outlined {
            font-size: 26px;
        }

        .alert-success, .alert-error {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>

<header class="navbar">
    <div class="navbar-left">
        <button id="hamburger-btn" aria-label="Toggle Sidebar">
            <span class="material-icons-outlined">menu</span>
        </button>
        <h1>Welcome, <?php echo htmlspecialchars($_SESSION['user_name']); ?>!</h1>
    </div>

    <div class="navbar-right">
        <a href="dashboard.php" class="nav-link">
            <span class="material-icons-outlined">dashboard</span>
            <span>Dashboard</span>
        </a>
        
        <a href="transaction.php" class="nav-link">
            <span class="material-icons-outlined">receipt_long</span>
            <span>Transaction</span>
        </a>
    </div>
</header>

<?php include 'sidebar.php'; ?>
<div id="sidebar-overlay" class="sidebar-overlay"></div>

<main class="container">
    <form method="POST" action="create_group.php">
        <?php if (isset($_GET['success'])): ?>
            <div class="alert-success">Group created successfully!</div>
        <?php elseif (isset($_GET['error'])): ?>
            <div class="alert-error"><?php echo htmlspecialchars($_GET['error']); ?></div>
        <?php endif; ?>

        <div class="form-group">
            <label for="group-name">GROUP NAME</label>
            <input type="text" id="group-name" name="group_name" placeholder="e.g. Family Budget" required>
        </div>

        <div class="form-group">
            <label for="group-type">GROUP TYPE</label>
            <select id="group-type" name="group_type" required>
                <option value="One Time">One Time</option>
                <option value="Regular">Regular</option>
            </select>
        </div>

        <div class="form-group">
            <label for="group-budget">GROUP BUDGET</label>
            <input type="number" id="group-budget" name="group_budget" placeholder="Enter group budget (Rp)" step="1000" min="0">
        </div>

        <div class="form-group">
            <label for="invite-email">INVITE PARTICIPANT</label>
            <div class="invite-wrapper">
                <input type="email" id="invite-email" placeholder="Type user email..." list="user-emails">
                <button type="button" id="add-participant-btn">Add</button>
            </div>

            <datalist id="user-emails">
                <?php foreach ($users_list as $user): ?>
                    <option value="<?php echo htmlspecialchars($user['email']); ?>">
                        <?php echo htmlspecialchars($user['name']); ?>
                    </option>
                <?php endforeach; ?>
            </datalist>

            <div id="participants-list" class="participants-list"></div>
            <input type="hidden" name="participants" id="participants-hidden-input">
        </div>

        <button type="submit" class="submit-btn">Create Group</button>
    </form>
</main>

<script src="sidebar_script.js"></script>
<script src="create_group_script.js"></script>

</body>
</html>
