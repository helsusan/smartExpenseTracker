<?php
if (!isset($db)) {
    require 'db_config.php';
}

$user_id = $_SESSION['user_id'] ?? null;
$user_groups = [];

if ($user_id) {
    $stmt = $db->prepare("
        SELECT g.* FROM `groups` g
        JOIN `group_members` gm ON g.id = gm.group_id
        WHERE gm.user_id = ?
    ");
    $stmt->execute([$user_id]);
    $user_groups = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
?>

<aside id="sidebar" class="sidebar">
    <nav class="sidebar-nav">
        
        <a href="dashboard.php" class="home-btn">
            <span class="material-icons-outlined">dashboard</span>
            <span>Home</span>
        </a>

        <div class="sidebar-separator"></div>

        <button class="add-group-btn" onclick="window.location.href='create_group.php'">
            <span class="material-icons-outlined">group_add</span>
            <span>Add Group</span>
        </button>

        <h3 class="group-title">Group List</h3>

        <ul class="group-list">
            <?php if (!empty($user_groups)): ?>
                <?php foreach ($user_groups as $group): ?>
                    <li>
                        <a href="group_detail.php?id=<?= $group['id'] ?>" class="group-item">
                            <span class="material-icons-outlined">group</span>
                            <span><?= htmlspecialchars($group['name']) ?></span>
                        </a>
                    </li>
                <?php endforeach; ?>
            <?php else: ?>
                <li style="padding: 10px; color: rgba(255,255,255,0.5); font-size: 0.9rem; list-style: none;">
                    No groups yet.
                </li>
            <?php endif; ?>
        </ul>
    </nav>

    <footer class="sidebar-footer">
        <a href="login.php" class="logout-btn">
            <span class="material-icons-outlined">logout</span>
            <span>Logout</span>
        </a>
    </footer>
</aside>
