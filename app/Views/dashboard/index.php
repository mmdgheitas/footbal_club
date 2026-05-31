<?php
/**
 * Dashboard View
 */
$totalPlayers = $total_players ?? 0;
$monthlyRevenue = $monthly_revenue ?? 0;
$totalOutstanding = $total_outstanding ?? 0;
$playersWithDebt = $players_with_debt ?? 0;
$lowAttendanceCount = $low_attendance_count ?? 0;
?>

<div class="dashboard">
    <div class="stats-grid">
        <div class="stat-card">
            <h3>تعداد کل بازیکنان</h3>
            <p class="stat-value"><?= $totalPlayers ?></p>
        </div>

        <div class="stat-card">
            <h3>درآمد ماهانه</h3>
            <p class="stat-value">$<?= number_format($monthlyRevenue, 2) ?></p>
        </div>

        <div class="stat-card alert-warning">
            <h3>بدهی‌های معوق</h3>
            <p class="stat-value">$<?= number_format($totalOutstanding, 2) ?></p>
            <p class="stat-subtitle"><?= $playersWithDebt ?> بازیکن</p>
        </div>

        <div class="stat-card alert-info">
            <h3>غیبت بیش از حد</h3>
            <p class="stat-value"><?= $lowAttendanceCount ?></p>
            <p class="stat-subtitle">زیر <?= ATTENDANCE_WARNING_THRESHOLD ?>% حضور</p>
        </div>
    </div>

    <div class="charts-section">
        <div class="chart-container">
            <h3>بازیکنان بر اساس رده سنی</h3>
            <div id="categoryChart" class="chart"></div>
        </div>

        <div class="chart-container">
            <h3>روند درآمد</h3>
            <div id="revenueChart" class="chart"></div>
        </div>
    </div>
</div>

<style>
.dashboard {
    padding: 20px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
}

.stat-card {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #666;
    text-transform: uppercase;
}

.stat-value {
    font-size: 32px;
    font-weight: bold;
    color: #333;
    margin: 0;
}

.stat-subtitle {
    font-size: 12px;
    color: #999;
    margin-top: 5px;
}

.stat-card.alert-warning {
    border-left: 4px solid #ff9800;
}

.stat-card.alert-info {
    border-left: 4px solid #2196f3;
}

.charts-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
}

.chart-container {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chart-container h3 {
    margin-top: 0;
}

.chart {
    min-height: 300px;
}
</style>
