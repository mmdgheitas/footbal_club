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
            <a href="<?= APP_URL ?>/payments" class="btn btn-secondary">تاریخچه پرداخت‌ها</a>
            <a href="<?= APP_URL ?>/reports/financial" class="btn btn-secondary">گزارش مالی</a>
            <a href="<?= APP_URL ?>/reports/debts" class="btn btn-primary">بدهی‌های معوق</a>
        </div>
        <div style="background: #fce8e6; padding: 8px 15px; border-radius: 4px; color: #c5221f; font-weight: bold;">
            مجموع بدهی: <?= number_format($totalOutstanding, 0) ?> تومان
        </div>
    </div>

    <h4>لیست بدهی‌های معوق</h4>
    <?php if (empty($debts)): ?>
        <p class="empty-message">هیچ بدهی معوقی یافت نشد. همه بازیکنان تسویه حساب کرده‌اند!</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>نام بازیکن</th>
                    <th>ایمیل</th>
                    <th>تعداد پرداخت‌های معوق</th>
                    <th>مبلغ کل بدهی</th>
                    <th>عملیات</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($debts as $debt): ?>
                <tr>
                    <td><?= \App\Helpers\SecurityHelper::escape($debt['name']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape($debt['email'] ?? '-') ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape((string)$debt['pending_count']) ?></td>
                    <td style="color: #c5221f; font-weight: bold;"><?= number_format($debt['total_outstanding'], 0) ?> تومان</td>
                    <td>
                        <a href="<?= APP_URL ?>/sms/send?player_id=<?= $debt['id'] ?>" class="btn btn-secondary btn-sm">ارسال یادآوری</a>
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
