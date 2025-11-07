<?php
include 'db_config.php';

// Hardcoded user_id
$current_user_id = 3;

// Handle delete category (AJAX)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_category') {
    try {
        $stmt = $db->prepare("DELETE FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)");
        $stmt->execute([$_POST['category_id'], $current_user_id]);
        echo json_encode(['success' => true]);
    } catch(Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// Handle search categories (AJAX)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'search_categories') {
    try {
        $search = '%' . $_POST['search'] . '%';
        $stmt = $db->prepare("SELECT * FROM categories WHERE (user_id IS NULL OR user_id = ?) AND name LIKE ? ORDER BY name LIMIT 10");
        $stmt->execute([$current_user_id, $search]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'categories' => $results]);
    } catch(Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_expense') {
    try {
        $db->beginTransaction();
        
        // Check if need to create new category
        $category_id = null;
        if (!empty($_POST['category_name'])) {
            // Check if category exists
            $stmt = $db->prepare("SELECT id FROM categories WHERE name = ? AND (user_id IS NULL OR user_id = ?)");
            $stmt->execute([$_POST['category_name'], $current_user_id]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                $category_id = $existing['id'];
            } else {
                // Create new category
                $stmt = $db->prepare("INSERT INTO categories (user_id, name) VALUES (?, ?)");
                $stmt->execute([$current_user_id, $_POST['category_name']]);
                $category_id = $db->lastInsertId();
            }
        }
        
        // Insert into transactions table
        $stmt = $db->prepare("INSERT INTO transactions (user_id, date, payment_method, category_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $current_user_id,
            $_POST['transaction_date'],
            $_POST['payment_method'],
            $category_id
        ]);
        $transaction_id = $db->lastInsertId();
        
        // Insert transaction items
        if (isset($_POST['items']) && is_array($_POST['items'])) {
            $stmt = $db->prepare("INSERT INTO transaction_items (transaction_id, item_name, quantity, unit_price) VALUES (?, ?, ?, ?)");
            foreach ($_POST['items'] as $item) {
                if (!empty($item['name']) && !empty($item['quantity']) && !empty($item['price'])) {
                    $stmt->execute([
                        $transaction_id,
                        $item['name'],
                        $item['quantity'],
                        $item['price']
                    ]);
                }
            }
        }
        
        // Insert transaction summary
        $stmt = $db->prepare("INSERT INTO transaction_summary (transaction_id, subtotal, tax, service_charge, discount, others, grand_total) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $transaction_id,
            $_POST['subtotal'],
            $_POST['tax'],
            $_POST['service_charge'],
            $_POST['discount'],
            $_POST['others'],
            $_POST['grand_total']
        ]);
        
        // Insert group memberships
        if (isset($_POST['groups']) && is_array($_POST['groups'])) {
            $stmt = $db->prepare("INSERT INTO transaction_groups (transaction_id, group_id) VALUES (?, ?)");
            foreach ($_POST['groups'] as $group_id) {
                $stmt->execute([$transaction_id, $group_id]);
            }
        }
        
        $db->commit();
        $success_message = "Expense added successfully!";
    } catch(Exception $e) {
        $db->rollBack();
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
    <title>Smart Expense Tracker - Add Expense</title>
    <link rel="stylesheet" href="expense_style.css">
</head>
<body>
    <div class="container">
        <?php if (isset($success_message)): ?>
            <div class="alert alert-success"><?= $success_message; ?></div>
        <?php endif; ?>

        <?php if (isset($error_message)): ?>
            <div class="alert alert-error"><?= $error_message; ?></div>
        <?php endif; ?>

        <div class="tab-container">
            <a href="income_form.php" class="tab">Income</a>
            <a href="expense_form.php" class="tab active">Expense</a>
        </div>

        <form id="expenseForm" method="POST" enctype="multipart/form-data">
            <input type="hidden" name="action" value="add_expense">
            <input type="hidden" name="category_name" id="categoryNameInput">

            <div class="form-container">
                <!-- Bagian kiri -->
                <div class="left-section">
                    <h3 class="section-title">Invoice</h3>
                    <div class="upload-area" onclick="document.getElementById('invoiceUpload').click()">
                        <div class="upload-icon">➕</div>
                        <div class="upload-text">Add Invoice</div>
                        <input type="file" id="invoiceUpload" name="invoice" style="display: none;" accept="image/*,.pdf">
                    </div>

                    <div class="items-table">
                        <table id="itemsTable">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><input type="text" name="items[0][name]" placeholder="Item name" class="item-name"></td>
                                    <td><input type="number" name="items[0][quantity]" placeholder="0" class="item-quantity" step="0.01"></td>
                                    <td><input type="text" name="items[0][price]" placeholder="Rp 0" class="item-price"></td>
                                    <td><button type="button" class="delete-btn" onclick="deleteRow(this)">🗑️</button></td>
                                </tr>
                            </tbody>
                        </table>
                        <button type="button" class="add-row-btn" onclick="addItemRow()">+ Add Item</button>
                    </div>

                    <div class="summary-item">
                        <span class="summary-label">Subtotal</span>
                        <input type="text" name="subtotal" class="summary-input" id="subtotal" value="Rp 0" readonly>
                    </div>

                    <div class="summary-item">
                        <span class="summary-label">Tax</span>
                        <input type="text" name="tax" class="summary-input" id="tax" placeholder="Rp 0">
                    </div>

                    <div class="summary-item">
                        <span class="summary-label">Service</span>
                        <input type="text" name="service_charge" class="summary-input" id="service" placeholder="Rp 0">
                    </div>

                    <div class="summary-item">
                        <span class="summary-label">Discount</span>
                        <input type="text" name="discount" class="summary-input" id="discount" placeholder="Rp 0">
                    </div>

                    <div class="summary-item">
                        <span class="summary-label">Others</span>
                        <input type="text" name="others" class="summary-input" id="others" placeholder="Rp 0">
                    </div>

                    <div class="total-amount">
                        <div class="total-label">Total Amount</div>
                        <div class="total-value" id="totalAmount">Rp 0</div>
                        <input type="hidden" name="grand_total" id="grandTotalInput" value="0">
                    </div>
                </div>

                <div class="divider"></div>

                <!-- Bagian kanan -->
                <div class="right-section">
                    <div class="form-group">
                        <label class="form-label">Expense Name</label>
                        <input type="text" class="form-input" id="expenseName" name="expense_name" placeholder="Enter expense name" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="date" class="form-input" id="transactionDate" name="transaction_date" value="<?= date('Y-m-d'); ?>" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Payment Method</label>
                        <select class="form-select" id="paymentMethod" name="payment_method" required>
                            <option value="Cash">💵 Cash</option>
                            <option value="BCA">🏦 BCA</option>
                            <option value="BRI">🏦 BRI</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <div class="category-autocomplete">
                            <input type="text" class="form-input" id="categoryInput" placeholder="Type to search or create category" autocomplete="off">
                            <div class="category-dropdown" id="categoryDropdown">
                                <div class="dropdown-header">Select an option or create one</div>
                                <div id="categoryOptions"></div>
                                <div class="create-option" id="createOption" style="display: none;">
                                    <span class="create-label">Create</span>
                                    <span id="createText"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Group</label>
                        <div class="checkbox-group" id="groupCheckboxes">
                            <?php foreach ($groups as $group): ?>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="group_<?= $group['id']; ?>" name="groups[]" value="<?= $group['id']; ?>">
                                    <label for="group_<?= $group['id']; ?>"><?= htmlspecialchars($group['name']); ?></label>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <button type="submit" class="submit-btn">Add</button>
                </div>
            </div>
        </form>
    </div>

    <script src="expense_script.js"></script>
</body>
</html>