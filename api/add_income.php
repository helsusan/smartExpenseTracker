<?php
// FILE: api/add_income.php
// CHANGED/NEW: Accept JSON POST payload and insert transaction + transaction_groups
header('Content-Type: application/json');
// CHANGED: Enable CORS for S3-hosted frontend (adjust origin in production)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit; // for preflight
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
    exit;
}

require_once __DIR__ . '/../db_config.php';

try {
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
    $name = isset($data['income_name']) ? trim($data['income_name']) : '';
    $amount = isset($data['amount']) ? floatval($data['amount']) : 0;
    $date = isset($data['income_date']) ? $data['income_date'] : null;
    $payment_method = isset($data['payment_method']) ? $data['payment_method'] : null;
    $groups = isset($data['groups']) && is_array($data['groups']) ? $data['groups'] : [];

    if ($user_id <= 0 || $amount <= 0 || $name === '' || !$date) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }

    $db->beginTransaction();

    $stmt = $db->prepare("INSERT INTO transactions (user_id, category_id, type, name, amount, date, payment_method, created_at, updated_at) VALUES (?, NULL, 'Income', ?, ?, ?, ?, NOW(), NOW())");
    $stmt->execute([$user_id, $name, $amount, $date, $payment_method]);
    $transaction_id = $db->lastInsertId();

    if (!empty($groups)) {
        $stmt = $db->prepare("INSERT INTO transaction_groups (transaction_id, group_id) VALUES (?, ?)");
        foreach ($groups as $g) {
            $stmt->execute([$transaction_id, intval($g)]);
        }
    }

    $db->commit();
    echo json_encode(['success' => true, 'transaction_id' => $transaction_id]);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
