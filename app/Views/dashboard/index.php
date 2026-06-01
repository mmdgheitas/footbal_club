<?php
/**
 * Dashboard View — youth club stats & charts
 */
$totalPlayers = $total_players ?? 0;
$monthlyRevenue = $monthly_revenue ?? 0;
$totalOutstanding = $total_outstanding ?? 0;
$playersWithDebt = $players_with_debt ?? 0;
$lowAttendanceCount = $low_attendance_count ?? 0;
$byCategory = $players_by_category ?? [];
$yearlyRevenue = $yearly_revenue ?? [];

$maxCategory = 1;
foreach ($byCategory as $row) {
    $maxCategory = max($maxCategory, (int)($row['count'] ?? 0));
}

$monthLabels = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
$revenueByMonth = array_fill(1, 12, 0);
foreach ($yearlyRevenue as $row) {
    $m = (int)($row['month'] ?? 0);
    if ($m >= 1 && $m <= 12) {
        $revenueByMonth[$m] = (float)($row['total'] ?? 0);
    }
}
$maxRevenue = max(1, max($revenueByMonth));
?>

<div class="dashboard">
    <div class="quick-actions">
        <a href="<?= APP_URL ?>/player/create" class="quick-action-btn">⚽ بازیکن جدید</a>
        <a href="<?= APP_URL ?>/attendance" class="quick-action-btn">📋 ثبت حضور</a>
        <a href="<?= APP_URL ?>/payments" class="quick-action-btn">💰 ثبت پرداخت</a>
        <a href="<?= APP_URL ?>/sms/send" class="quick-action-btn">📱 ارسال پیامک</a>
    </div>

    <div class="stats-grid">
        <div class="stat-card stat-success">
            <span class="stat-icon">⚽</span>
            <h3>بازیکنان فعال</h3>
            <p class="stat-value" data-count="<?= (int)$totalPlayers ?>">0</p>
        </div>

        <div class="stat-card">
            <span class="stat-icon">💵</span>
            <h3>درآمد این ماه</h3>
            <p class="stat-value" data-count="<?= (float)$monthlyRevenue ?>" data-money>0</p>
        </div>

        <div class="stat-card stat-warning">
            <span class="stat-icon">📌</span>
            <h3>بدهی معوق</h3>
            <p class="stat-value" data-count="<?= (float)$totalOutstanding ?>" data-money>0</p>
            <p class="stat-subtitle"><?= (int)$playersWithDebt ?> بازیکن</p>
        </div>

        <div class="stat-card stat-info">
            <span class="stat-icon">⚠️</span>
            <h3>غیبت زیاد</h3>
            <p class="stat-value" data-count="<?= (int)$lowAttendanceCount ?>">0</p>
            <p class="stat-subtitle">زیر <?= ATTENDANCE_WARNING_THRESHOLD ?>٪ حضور</p>
        </div>
    </div>

    <div class="charts-section">
        <div class="chart-container">
            <h3>📊 بازیکنان بر اساس رده سنی</h3>
            <?php if (empty($byCategory)): ?>
                <p class="empty-message">هنوز بازیکنی ثبت نشده</p>
            <?php else: ?>
                <div class="bar-chart">
                    <?php foreach ($byCategory as $row):
                        $count = (int)($row['count'] ?? 0);
                        $cat = $row['age_category'] ?? '';
                        $label = AGE_CATEGORIES[$cat]['label'] ?? $cat;
                        $pct = round(($count / $maxCategory) * 100);
                    ?>
                    <div class="bar-row">
                        <span class="bar-label"><?= \App\Helpers\SecurityHelper::escape($label) ?></span>
                        <div class="bar-track">
                            <div class="bar-fill" data-width="<?= $pct ?>"></div>
                        </div>
                        <span class="bar-value"><?= $count ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

        <div class="chart-container">
            <h3>📈 درآمد ماهانه (<?= date('Y') ?>)</h3>
            <div class="bar-chart">
                <?php for ($m = 1; $m <= 12; $m++):
                    $amount = $revenueByMonth[$m];
                    $pct = round(($amount / $maxRevenue) * 100);
                ?>
                <div class="bar-row">
                    <span class="bar-label"><?= $monthLabels[$m] ?></span>
                    <div class="bar-track">
                        <div class="bar-fill bar-fill-revenue" data-width="<?= $pct ?>"></div>
                    </div>
                    <span class="bar-value"><?= $amount > 0 ? number_format($amount, 0) : '—' ?></span>
                </div>
                <?php endfor; ?>
            </div>
        </div>
    </div>
</div>
