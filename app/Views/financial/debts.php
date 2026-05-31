<?php
/**
 * Financial Debts View
 */
$debts = $debts ?? [];
$totalOutstanding = $total_outstanding ?? 0;
?>

<div class="financial-section">
    <div class="section-header" style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 15px;">
            <a href="<?= APP_URL ?>/payments" class="btn btn-secondary">Payments History</a>
            <a href="<?= APP_URL ?>/reports/financial" class="btn btn-secondary">Financial Report</a>
            <a href="<?= APP_URL ?>/reports/debts" class="btn btn-primary">Outstanding Debts</a>
        </div>
        <div style="background: #fce8e6; padding: 8px 15px; border-radius: 4px; color: #c5221f; font-weight: bold;">
            Total Outstanding: $<?= number_format($totalOutstanding, 2) ?>
        </div>
    </div>

    <h4>Outstanding Debts List</h4>
    <?php if (empty($debts)): ?>
        <p class="empty-message">No outstanding debts found. All players are fully paid!</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Player Name</th>
                    <th>Email Address</th>
                    <th>Pending Payments Count</th>
                    <th>Total Outstanding Amount</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($debts as $debt): ?>
                <tr>
                    <td><?= \App\Helpers\SecurityHelper::escape($debt['name']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape($debt['email'] ?? '-') ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape((string)$debt['pending_count']) ?></td>
                    <td style="color: #c5221f; font-weight: bold;">$<?= number_format($debt['total_outstanding'], 2) ?></td>
                    <td>
                        <a href="<?= APP_URL ?>/sms/send?player_id=<?= $debt['id'] ?>" class="btn btn-secondary btn-sm">Send Reminder</a>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<style>
.financial-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.empty-message {
    text-align: center;
    color: #999;
    padding: 40px;
}
.btn-sm {
    padding: 5px 10px;
    font-size: 12px;
}
</style>
