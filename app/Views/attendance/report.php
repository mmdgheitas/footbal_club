<?php
/**
 * Player Attendance Report View
 */
$player = $player ?? [];
$attendance = $attendance ?? [];
$percentage = $percentage ?? '0.00';
$attendanceStatus = $attendance_status ?? [];
?>

<div class="attendance-section">
    <div class="section-header" style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
        <h3>گزارش حضور و غیاب <?= \App\Helpers\SecurityHelper::escape($player['name']) ?></h3>
        <a href="<?= APP_URL ?>/attendance" class="btn btn-secondary">بازگشت به صفحه حضور و غیاب</a>
    </div>

    <div class="stats-overview" style="margin-bottom: 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
        <div class="stat-card" style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50;">
            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px;">درصد حضور</h4>
            <p class="stat-value" style="font-size: 32px; font-weight: bold; margin: 0; color: #333;"><?= $percentage ?>%</p>
        </div>
        <div class="stat-card" style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3;">
            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px;">تعداد جلسات</h4>
            <p class="stat-value" style="font-size: 32px; font-weight: bold; margin: 0; color: #333;"><?= count($attendance) ?></p>
        </div>
    </div>

    <h4>تاریخچه جلسات</h4>
    <?php if (empty($attendance)): ?>
        <p class="empty-message">هیچ سابقه حضوری برای این بازیکن ثبت نشده است.</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>تاریخ</th>
                    <th>وضعیت</th>
                    <th>ثبت‌کننده</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($attendance as $record): ?>
                <tr>
                    <td><?= date('Y-m-d', strtotime($record['session_date'])) ?></td>
                    <td>
                        <span class="status-badge status-<?= $record['status'] ?>">
                            <?= \App\Helpers\SecurityHelper::escape($attendanceStatus[$record['status']] ?? 'نامشخص') ?>
                        </span>
                    </td>
                    <td><?= \App\Helpers\SecurityHelper::escape($record['recorder_name'] ?? 'سیستم') ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<style>
.attendance-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
}
.status-1 {
    background: #e6f4ea;
    color: #137333;
}
.status-2 {
    background: #fce8e6;
    color: #c5221f;
}
.status-3 {
    background: #fef7e0;
    color: #b06000;
}
.status-4 {
    background: #e8f0fe;
    color: #1a73e8;
}
.empty-message {
    text-align: center;
    color: #999;
    padding: 40px;
}
</style>
