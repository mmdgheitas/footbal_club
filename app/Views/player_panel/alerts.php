<?php
/**
 * Player Panel - Alerts View
 */
$alerts = $alerts ?? [];
?>

<div style="margin-bottom: 24px;">
    <p style="color: #666; font-size: 15px;">در این بخش می‌توانید اطلاعیه‌ها و اعلانات منتشر شده توسط کادر فنی و مدیریت باشگاه را دنبال کنید.</p>
</div>

<!-- Alerts Feed -->
<div class="card" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 24px;">
    <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 20px 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 12px;">📢 تابلوی اعلانات باشگاه</h3>

    <?php if (empty($alerts)): ?>
        <p style="color: #888; text-align: center; padding: 40px 0; font-size: 14px;">هیچ اطلاعیه‌ای برای شما ثبت نشده است.</p>
    <?php else: ?>
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <?php foreach ($alerts as $alert): ?>
                <div style="padding: 20px; background: #faf9f6; border-radius: 8px; border-left: 4px solid #3498db; transition: transform 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                        <h4 style="font-size: 16px; font-weight: 700; margin: 0; color: #2c3e50;">
                            <?= \App\Helpers\SecurityHelper::escape($alert['title']) ?>
                        </h4>
                        <span style="font-size: 12px; color: #888; background: #eee; padding: 2px 8px; border-radius: 4px;">
                            📅 <?= date(DISPLAY_DATETIME_FORMAT, strtotime($alert['created_at'])) ?>
                        </span>
                    </div>
                    <div style="font-size: 14px; color: #444; line-height: 1.8; margin-bottom: 12px; white-space: pre-line; text-align: justify;">
                        <?= \App\Helpers\SecurityHelper::escape($alert['message']) ?>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #999; border-top: 1px dashed #ddd; padding-top: 8px;">
                        <span>نویسنده: <strong><?= \App\Helpers\SecurityHelper::escape($alert['author_name'] ?? 'مدیریت باشگاه') ?></strong></span>
                        <?php if ($alert['target_audience'] !== 'all'): ?>
                            <span style="color: #ffa502; font-weight: 600; background: #fffaf0; padding: 2px 6px; border-radius: 4px;">
                                ویژه رده: <?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$alert['target_audience']]['label'] ?? $alert['target_audience']) ?>
                            </span>
                        <?php else: ?>
                            <span style="color: #2ed573; font-weight: 600; background: #f1f9f5; padding: 2px 6px; border-radius: 4px;">عمومی</span>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
