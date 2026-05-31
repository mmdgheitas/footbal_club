<?php
/**
 * SMS Logs View
 */
$logs = $logs ?? [];
$filter = $filter ?? 'all';
?>

<div class="sms-section">
    <div class="section-header">
        <h3>SMS Logs</h3>
        <form method="GET" class="filter-form">
            <select name="filter">
                <option value="all" <?= $filter === 'all' ? 'selected' : '' ?>>All</option>
                <option value="sent" <?= $filter === 'sent' ? 'selected' : '' ?>>Sent</option>
                <option value="pending" <?= $filter === 'pending' ? 'selected' : '' ?>>Pending</option>
                <option value="failed" <?= $filter === 'failed' ? 'selected' : '' ?>>Failed</option>
            </select>
            <button type="submit" class="btn btn-secondary">Filter</button>
        </form>
    </div>

    <?php if (empty($logs)): ?>
        <p class="empty-message">No SMS logs found.</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Recipient</th>
                    <th>Message</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($logs as $log): ?>
                <tr>
                    <td><?= \App\Helpers\SecurityHelper::escape($log['recipient_phone']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape(substr($log['message'], 0, 50)) ?>...</td>
                    <td><?= \App\Helpers\SecurityHelper::escape($log['sms_type']) ?></td>
                    <td>
                        <span class="badge badge-<?= $log['status'] ?>">
                            <?= ucfirst($log['status']) ?>
                        </span>
                    </td>
                    <td><?= date(DISPLAY_DATETIME_FORMAT, strtotime($log['created_at'])) ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<style>
.sms-section {
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

.filter-form {
    display: flex;
    gap: 10px;
}

.filter-form select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
}

.badge-sent,
.badge-delivered {
    background: #d4edda;
    color: #155724;
}

.badge-pending {
    background: #fff3cd;
    color: #856404;
}

.badge-failed {
    background: #f8d7da;
    color: #721c24;
}

.empty-message {
    text-align: center;
    color: #999;
    padding: 40px;
}
</style>
