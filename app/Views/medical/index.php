<?php
/**
 * Medical Records Index View
 */
$players = $players ?? [];
$csrfToken = $csrf_token ?? '';
?>

<div class="medical-section">
    <div class="section-header" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <h3>Medical Clearance & Records</h3>
    </div>

    <?php if (empty($players)): ?>
        <p class="empty-message">No active players found.</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Player Name</th>
                    <th>Age Category</th>
                    <th>Medical Clearance</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($players as $player): ?>
                <tr>
                    <td><?= \App\Helpers\SecurityHelper::escape($player['name']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? '') ?></td>
                    <td>
                        <span class="clearance-badge <?= $player['medical_clearance'] ? 'clearance-cleared' : 'clearance-pending' ?>">
                            <?= $player['medical_clearance'] ? '✓ Cleared' : '✗ Pending' ?>
                        </span>
                    </td>
                    <td>
                        <a href="<?= APP_URL ?>/medical/view/<?= $player['id'] ?>" class="btn btn-secondary">View / Edit Record</a>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<style>
.medical-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.clearance-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
}
.clearance-cleared {
    background: #e6f4ea;
    color: #137333;
}
.clearance-pending {
    background: #fce8e6;
    color: #c5221f;
}
.empty-message {
    text-align: center;
    color: #999;
    padding: 40px;
}
</style>
