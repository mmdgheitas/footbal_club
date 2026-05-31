<?php
/**
 * Admin Users List View
 */
$users = $users ?? [];
$roles = $roles ?? [];
$selectedRole = $selected_role ?? '';
?>

<div class="admin-section">
    <div class="admin-nav" style="margin-bottom: 20px; display: flex; gap: 15px;">
        <a href="<?= APP_URL ?>/admin/users" class="btn btn-primary">User Management</a>
        <a href="<?= APP_URL ?>/admin/settings" class="btn btn-secondary">Settings</a>
    </div>

    <div class="section-header">
        <h3>User Management</h3>
        <form method="GET" class="role-filter">
            <select name="role" onchange="this.form.submit()">
                <option value="">All Roles</option>
                <?php foreach ($roles as $key => $label): ?>
                    <option value="<?= $key ?>" <?= $selectedRole === $key ? 'selected' : '' ?>><?= $label ?></option>
                <?php endforeach; ?>
            </select>
        </form>
    </div>

    <?php if (empty($users)): ?>
        <p class="empty-message">No users found.</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created At</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($users as $user): ?>
                <tr>
                    <td><?= \App\Helpers\SecurityHelper::escape($user['name']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape($user['email']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape($user['phone'] ?? '-') ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape(ROLES[$user['role']] ?? $user['role']) ?></td>
                    <td>
                        <span class="status-badge <?= $user['status'] ? 'status-active' : 'status-inactive' ?>">
                            <?= $user['status'] ? 'Active' : 'Disabled' ?>
                        </span>
                    </td>
                    <td><?= date('Y-m-d H:i', strtotime($user['created_at'])) ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<style>
.admin-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}
.role-filter select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
}
.status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
}
.status-active {
    background: #e6f4ea;
    color: #137333;
}
.status-inactive {
    background: #fce8e6;
    color: #c5221f;
}
.empty-message {
    text-align: center;
    color: #999;
    padding: 40px;
}
</style>
