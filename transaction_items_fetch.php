<?php
require 'db_config.php';

if (isset($_GET['id'])) {
    $transaction_id = $_GET['id'];

    $query = $db->prepare("
        SELECT item_name, quantity, unit_price, subtotal
        FROM transaction_items
        WHERE transaction_id = :id
    ");
    $query->execute(['id' => $transaction_id]);
    $items = $query->fetchAll(PDO::FETCH_ASSOC);

    header('Content-Type: application/json');
    echo json_encode($items);
}
?>
