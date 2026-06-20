<?php
/**
 * Player Panel - Dashboard Index View
 */
$attendanceRate = $attendance_rate ?? 0;
$outstanding = $total_outstanding ?? 0;
$paid = $total_paid ?? 0;
$recentAlerts = $recent_alerts ?? [];
$player = $player ?? [];
?>

<div style="margin-bottom: 24px;">
    <p style="color: #666; font-size: 15px;">خوش آمدید، <strong><?= \App\Helpers\SecurityHelper::escape($player['name']) ?></strong>. در اینجا خلاصه وضعیت شما در باشگاه فوتبال آمده است.</p>
</div>

<!-- Stats Grid -->
<div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px;">
    <!-- Financial Card -->
    <div class="card" style="border-right: 4px solid <?= $outstanding > 0 ? '#e056fd' : '#2ed573' ?>; background: white; padding: 24px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 14px; color: #888; font-weight: 600;">وضعیت مالی</span>
            <span style="font-size: 24px;">💰</span>
        </div>
        <?php if ($outstanding > 0): ?>
            <h3 style="font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #e056fd;">
                <?= number_format($outstanding) ?> ریال بدهی
            </h3>
            <p style="font-size: 13px; color: #7f8c8d; margin: 0;">شما بدهی معوقه پرداخت‌نشده دارید. لطفا اقدام فرمایید.</p>
        <?php else: ?>
            <h3 style="font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #2ed573;">تسویه حساب کامل</h3>
            <p style="font-size: 13px; color: #7f8c8d; margin: 0;">هیچ بدهی معوقه‌ای برای شما ثبت نشده است. سپاسگزاریم!</p>
        <?php endif; ?>
        <div style="margin-top: 16px; border-top: 1px solid #f1f2f6; padding-top: 12px;">
            <a href="<?= APP_URL ?>/player-panel/financial" style="font-size: 13px; text-decoration: none; color: #3498db; font-weight: 600;">مشاهده جزئیات تراکنش‌ها &larr;</a>
        </div>
    </div>

    <!-- Attendance Card -->
    <div class="card" style="border-right: 4px solid <?= $attendanceRate >= 75 ? '#2ed573' : '#ff4757' ?>; background: white; padding: 24px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 14px; color: #888; font-weight: 600;">نسبت حضور</span>
            <span style="font-size: 24px;">📋</span>
        </div>
        <h3 style="font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: <?= $attendanceRate >= 75 ? '#2ed573' : '#ff4757' ?>;">
            <?= number_format($attendanceRate, 1) ?>% حضور
        </h3>
        <div style="background: #f1f2f6; border-radius: 6px; height: 8px; width: 100%; overflow: hidden; margin-bottom: 8px;">
            <div style="background: <?= $attendanceRate >= 75 ? '#2ed573' : '#ff4757' ?>; height: 100%; width: <?= $attendanceRate ?>%;"></div>
        </div>
        <p style="font-size: 13px; color: #7f8c8d; margin: 0;">حد مجاز حضور در تمرینات حداقل ۷۵٪ است.</p>
        <div style="margin-top: 16px; border-top: 1px solid #f1f2f6; padding-top: 12px;">
            <a href="<?= APP_URL ?>/player-panel/attendance" style="font-size: 13px; text-decoration: none; color: #3498db; font-weight: 600;">تاریخچه حضور و غیاب &larr;</a>
        </div>
    </div>

    <!-- Profile Details Card -->
    <div class="card" style="border-right: 4px solid #3498db; background: white; padding: 24px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 14px; color: #888; font-weight: 600;">پروفایل بازیکن</span>
            <span style="font-size: 24px;">👤</span>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 6px 0; color: #2c3e50;">
            پست: <?= \App\Helpers\SecurityHelper::escape(PLAYER_POSITIONS[$player['position']] ?? $player['position']) ?>
        </h3>
        <p style="font-size: 14px; color: #2c3e50; margin: 0 0 4px 0;">رده سنی: <strong><?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? $player['age_category']) ?></strong></p>
        <p style="font-size: 13px; color: #7f8c8d; margin: 0;">کد ملی: <?= \App\Helpers\SecurityHelper::escape($player['national_id']) ?></p>
        <div style="margin-top: 16px; border-top: 1px solid #f1f2f6; padding-top: 12px;">
            <a href="<?= APP_URL ?>/player-panel/profile" style="font-size: 13px; text-decoration: none; color: #3498db; font-weight: 600;">مشاهده پرونده کامل &larr;</a>
        </div>
    </div>
</div>

<!-- Alerts Panel -->
<div class="card" style="background: white; padding: 24px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin-bottom: 30px;">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 700; margin: 0; color: #2c3e50;">📢 آخرین اعلانات باشگاه</h3>
        <a href="<?= APP_URL ?>/player-panel/alerts" style="font-size: 13px; text-decoration: none; color: #3498db; font-weight: 600;">مشاهده همه</a>
    </div>

    <?php if (empty($recentAlerts)): ?>
        <p style="color: #888; text-align: center; padding: 20px 0; font-size: 14px;">هیچ اعلانی یافت نشد.</p>
    <?php else: ?>
        <div style="display: flex; flex-direction: column; gap: 14px;">
            <?php foreach ($recentAlerts as $alert): ?>
                <div style="padding: 16px; background: #faf9f6; border-radius: 8px; border-left: 3px solid #3498db;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h4 style="font-size: 15px; font-weight: 700; margin: 0; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($alert['title']) ?></h4>
                        <span style="font-size: 12px; color: #888;"><?= date(DISPLAY_DATE_FORMAT, strtotime($alert['created_at'])) ?></span>
                    </div>
                    <p style="font-size: 13px; color: #666; line-height: 1.6; margin: 0; white-space: pre-line;"><?= \App\Helpers\SecurityHelper::escape($alert['message']) ?></p>
                    <div style="margin-top: 8px; font-size: 11px; color: #999; text-align: left;">
                        توسط: <?= \App\Helpers\SecurityHelper::escape($alert['author_name'] ?? 'سیستم') ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
