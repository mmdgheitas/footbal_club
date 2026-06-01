<?php
$players = $players ?? [];
?>

<div class="medical-section panel">
    <div class="section-header">
        <h3 style="margin:0;color:var(--grass-bright);">پرونده و تأیید پزشکی</h3>
    </div>

    <?php if (empty($players)): ?>
        <p class="empty-message">بازیکن فعالی یافت نشد.</p>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>نام بازیکن</th>
                        <th>رده سنی</th>
                        <th>تأیید پزشکی</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($players as $player): ?>
                    <tr>
                        <td><strong><?= \App\Helpers\SecurityHelper::escape($player['name']) ?></strong></td>
                        <td><?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? '') ?></td>
                        <td>
                            <span class="status-pill <?= !empty($player['medical_clearance']) ? 'status-present' : 'status-absent' ?>">
                                <?= !empty($player['medical_clearance']) ? '✓ تأیید شده' : '✗ در انتظار' ?>
                            </span>
                        </td>
                        <td>
                            <a href="<?= APP_URL ?>/medical/view/<?= (int)$player['id'] ?>" class="btn btn-secondary btn-sm">مشاهده / ویرایش</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
