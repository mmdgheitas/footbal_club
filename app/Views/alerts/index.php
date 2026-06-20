<?php
/**
 * Admin/Staff Alert Management View
 */
$alerts = $alerts ?? [];
$ageCategories = $age_categories ?? [];
?>

<div style="margin-bottom: 24px;">
    <p style="color: #666; font-size: 15px;">در این بخش می‌توانید اطلاعیه‌های عمومی یا اختصاصی برای رده‌های سنی مختلف صادر کنید.</p>
</div>

<div style="display: grid; grid-template-columns: 1fr; gap: 30px; align-items: start;">
    <!-- Create Alert Card -->
    <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 24px;">
        <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 20px 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 12px;">📝 انتشار اعلان جدید</h3>
        
        <form action="<?= APP_URL ?>/admin/alerts/create" method="POST">
            <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrf_token) ?>">

            <div style="margin-bottom: 16px;">
                <label for="title" style="display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px;">عنوان اعلان</label>
                <input type="text" id="title" name="title" required placeholder="مثال: لغو تمرین روز دوشنبه" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 14px;">
            </div>

            <div style="margin-bottom: 16px;">
                <label for="target_audience" style="display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px;">مخاطبان هدف (رده سنی)</label>
                <select id="target_audience" name="target_audience" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 14px;">
                    <option value="all">همه بازیکنان (عمومی)</option>
                    <?php foreach ($ageCategories as $key => $cat): ?>
                        <option value="<?= $key ?>"><?= \App\Helpers\SecurityHelper::escape($cat['label']) ?> (<?= $key ?>)</option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div style="margin-bottom: 20px;">
                <label for="message" style="display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px;">متن اعلان</label>
                <textarea id="message" name="message" required rows="5" placeholder="متن پیام خود را در اینجا بنویسید..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 14px; line-height: 1.6; resize: vertical;"></textarea>
            </div>

            <div style="text-align: left;">
                <button type="submit" class="btn btn-primary" style="padding: 10px 24px; font-size: 14px; font-weight: 600; background: #3498db; border: none; border-radius: 6px; color: white; cursor: pointer;">📢 انتشار و ارسال</button>
            </div>
        </form>
    </div>

    <!-- Active Alerts Card -->
    <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 24px;">
        <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 20px 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 12px;">📋 لیست اعلانات فعال</h3>

        <?php if (empty($alerts)): ?>
            <p style="color: #888; text-align: center; padding: 30px 0;">هیچ اعلانی در سیستم ثبت نشده است.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table class="table" style="width: 100%; border-collapse: collapse; text-align: right;">
                    <thead>
                        <tr style="border-bottom: 2px solid #eee;">
                            <th style="padding: 12px 8px; font-weight: 600; color: #888;">عنوان</th>
                            <th style="padding: 12px 8px; font-weight: 600; color: #888;">مخاطبان</th>
                            <th style="padding: 12px 8px; font-weight: 600; color: #888;">نویسنده</th>
                            <th style="padding: 12px 8px; font-weight: 600; color: #888;">تاریخ انتشار</th>
                            <th style="padding: 12px 8px; font-weight: 600; color: #888; text-align: center;">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($alerts as $alert): ?>
                            <tr style="border-bottom: 1px solid #f1f2f6;">
                                <td style="padding: 14px 8px; font-weight: 600; font-size: 14px;">
                                    <?= \App\Helpers\SecurityHelper::escape($alert['title']) ?>
                                    <div style="font-weight: normal; font-size: 12px; color: #666; margin-top: 4px; max-width: 320px; line-height: 1.5;">
                                        <?= mb_strimwidth(\App\Helpers\SecurityHelper::escape($alert['message']), 0, 100, '...') ?>
                                    </div>
                                </td>
                                <td style="padding: 14px 8px;">
                                    <?php if ($alert['target_audience'] === 'all'): ?>
                                        <span class="badge" style="background: #2ed573; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">عمومی</span>
                                    <?php else: ?>
                                        <span class="badge" style="background: #ffa502; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                                            رده <?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$alert['target_audience']]['label'] ?? $alert['target_audience']) ?>
                                        </span>
                                    <?php endif; ?>
                                </td>
                                <td style="padding: 14px 8px; font-size: 13px; color: #555;">
                                    <?= \App\Helpers\SecurityHelper::escape($alert['author_name'] ?? 'سیستم') ?>
                                </td>
                                <td style="padding: 14px 8px; font-size: 13px; color: #777;">
                                    <?= date(DISPLAY_DATE_FORMAT, strtotime($alert['created_at'])) ?>
                                </td>
                                <td style="padding: 14px 8px; text-align: center;">
                                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteAlert(<?= $alert['id'] ?>)" style="font-size: 11px; padding: 4px 10px; border: 1px solid #ff4757; border-radius: 4px; color: #ff4757; background: none; cursor: pointer; font-weight: 600;">🗑️ حذف</button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<script>
async function deleteAlert(id) {
    if (!confirm('آیا از حذف این اعلان مطمئن هستید؟')) {
        return;
    }
    try {
        const response = await APP.request('<?= APP_URL ?>/admin/alerts/delete/' + id, {
            method: 'POST'
        });
        if (response.success) {
            APP.showMessage('success', 'اعلان با موفقیت حذف شد.');
            setTimeout(() => location.reload(), 800);
        } else {
            APP.showMessage('error', response.error || 'خطا در حذف اعلان.');
        }
    } catch (e) {
        APP.showMessage('error', 'خطا در ارتباط با سرور.');
    }
}
</script>
