<?php
if (!isset($db)) {
    require 'db_config.php';
}

// ambil semua grup milik user login
$user_id = $_SESSION['user_id'] ?? null;
$user_groups = [];

if ($user_id) {
    $stmt = $db->prepare("SELECT * FROM `groups` WHERE created_by = ?");
    $stmt->execute([$user_id]);
    $user_groups = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
?>
<aside id="sidebar" class="sidebar">
    <nav class="sidebar-nav">
        <button class="add-group-btn" onclick="window.location.href='create_group.php'">
            <span class="material-icons-outlined">group_add</span>
            <span>Add Group</span>
        </button>

        <h3 class="group-title">Group List</h3>

        <ul class="group-list">
            <?php if (!empty($user_groups)): ?>
                <?php foreach ($user_groups as $group): ?>
                    <li>
                        <a href="#" class="group-item">
                            <span class="material-icons-outlined">group</span>
                            <span><?= htmlspecialchars($group['name']) ?></span>
                        </a>
                    </li>
                <?php endforeach; ?>
            <?php else: ?>
                <li style="padding: 10px; color: #ccc; list-style: none;">
                    No groups created yet.
                </li>
            <?php endif; ?>
        </ul>
    </nav>

    <footer class="sidebar-footer">
        <a href="logout.php" class="logout-btn">
            <span class="material-icons-outlined">logout</span>
            <span>Logout</span>
        </a>
    </footer>
</aside>
