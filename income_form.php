<?php
include 'db_config.php';

$_SESSION['user_id'] = 3;
$_SESSION['user_name'] = 'Aiko';
$_SESSION['user_email'] = 'c14220072@john.petra.ac.id';

// Hardcoded user_id
$current_user_id = 3;

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_income') {
    try {
        // Validasi amount
        $amount = isset($_POST['amount']) ? floatval($_POST['amount']) : 0;
        
        if ($amount <= 0) {
            throw new Exception("Amount must be greater than 0");
        }
        
        $db->beginTransaction();
        
        // Insert into transactions table
        $stmt = $db->prepare("INSERT INTO transactions (user_id, category_id, type, name, amount, date, payment_method, created_at, updated_at) VALUES (?, NULL, 'Income', ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([
            $current_user_id,
            $_POST['income_name'],
            $amount,  // Gunakan variable yang sudah divalidasi
            $_POST['income_date'],
            $_POST['payment_method']
        ]);
        $transaction_id = $db->lastInsertId();
        
        // Insert group memberships for this transaction
        if (isset($_POST['groups']) && is_array($_POST['groups'])) {
            $stmt = $db->prepare("INSERT INTO transaction_groups (transaction_id, group_id) VALUES (?, ?)");
            foreach ($_POST['groups'] as $group_id) {
                $stmt->execute([$transaction_id, $group_id]);
            }
        }
        
        $db->commit();
        $success_message = "Income added successfully!";
    } catch(Exception $e) {
        // Cek apakah ada transaksi aktif sebelum rollback
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        
        $error_message = "Error: " . $e->getMessage();
    }
}

// Fetch groups for current user
$groups_query = "SELECT g.id, g.name FROM `groups` g 
                 INNER JOIN group_members gm ON g.id = gm.group_id 
                 WHERE gm.user_id = ? AND gm.status = 'active'";
$stmt = $db->prepare($groups_query);
$stmt->execute([$current_user_id]);
$groups = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">
    <title>Smart Expense Tracker - Add Income</title>
    <link rel="stylesheet" href="income_style.css">

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

    <div class="income-container">
        <?php if (isset($success_message)): ?>
            <div class="alert alert-success"><?php echo $success_message; ?></div>
        <?php endif; ?>
        
        <?php if (isset($error_message)): ?>
            <div class="alert alert-error"><?php echo $error_message; ?></div>
        <?php endif; ?>

        <!-- <div class="tab-container">
            <a href="income_form.php" class="tab active">Income</a>
            <a href="expense_form.php" class="tab">Expense</a>
        </div> -->

        <div class="tab-header">
            <a href="dashboard.php" class="back-btn">
                <span class="material-icons-outlined">logout</span>
            </a>
            
            <div class="tab-container">
                <a href="income_form.php" class="tab active">Income</a>
                <a href="expense_form.php" class="tab">Expense</a>
            </div>
        </div>

        <div class="form-container">
            <form id="incomeForm" method="POST">
                <input type="hidden" name="action" value="add_income">

                <div class="form-group">
                    <label class="form-label">Income Name</label>
                    <input type="text" class="form-input" id="incomeName" name="income_name" placeholder="Enter income name" required>
                </div>

                <div class="form-group date-input">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-input" id="incomeDate" name="income_date" value="<?php echo date('Y-m-d'); ?>" required>
                </div>

                <div class="form-group total-amount-field">
                    <label class="form-label">Amount</label>
                    <input type="text" class="form-input" id="totalAmount" placeholder="Rp 0" required>
                    <input type="hidden" name="amount" id="amountHidden">
                </div>

                <div class="form-group">
                    <label class="form-label">Payment Method</label>
                        <select class="form-select" id="paymentMethod" name="payment_method" required>
                            <option value="Cash">Cash</option>
                            <option value="BCA">BCA</option>
                            <option value="BRI">BRI</option>
                        </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Group</label>
                    <div class="checkbox-group">
                        <?php foreach ($groups as $group): ?>
                            <div class="checkbox-item">
                                <input type="checkbox" id="group_<?php echo $group['id']; ?>" name="groups[]" value="<?php echo $group['id']; ?>">
                                <label for="group_<?php echo $group['id']; ?>"><?php echo htmlspecialchars($group['name']); ?></label>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <button type="submit" class="submit-btn">Add</button>
            </form>
        </div>
    </div>

    <script src="income_script.js"></script>
    <script src="sidebar_script.js"></script>
</body>
</html>