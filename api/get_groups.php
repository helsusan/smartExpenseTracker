<?php
// FILE: api/get_groups.php
// CHANGED/NEW: Provides JSON list of groups for a given user_id
header('Content-Type: application/json');
// CHANGED: Enable CORS for S3-hosted frontend (adjust origin in production)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit; // CORS preflight
}

require_once __DIR__ . '/../db_config.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
if ($user_id <= 0) {
    echo json_encode([]);
    exit;
}

$stmt = $db->prepare("SELECT g.id, g.name FROM `groups` g 
    INNER JOIN group_members gm ON g.id = gm.group_id 
    WHERE gm.user_id = ? AND gm.status = 'active'");
$stmt->execute([$user_id]);
$groups = $stmt->fetchAll();

echo json_encode($groups);
