<?php
/**
 * Player create / edit form
 */
$player = $player ?? null;
$positions = $positions ?? PLAYER_POSITIONS;
$csrfToken = $csrf_token ?? '';
$isEdit = $player !== null;
$formAction = $isEdit
    ? APP_URL . '/player/update/' . (int)$player['id']
    : APP_URL . '/player/store';
$pageHeading = $isEdit ? 'ویرایش بازیکن' : 'افزودن بازیکن';
?>
<div class="player-form-section panel">
    <div class="form-toolbar">
        <a href="<?= APP_URL ?>/players" class="btn btn-secondary">بازگشت به لیست</a>
        <?php if ($isEdit): ?>
            <a href="<?= APP_URL ?>/player/view/<?= (int)$player['id'] ?>" class="btn btn-secondary">مشاهده پروفایل</a>
        <?php endif; ?>
    </div>

    <form id="playerForm" method="POST" action="<?= \App\Helpers\SecurityHelper::escapeAttribute($formAction) ?>"
          enctype="multipart/form-data" data-ajax="true">
        <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

        <div class="form-grid">
            <div class="form-group">
                <label for="name">نام کامل *</label>
                <input type="text" id="name" name="name" required
                       value="<?= \App\Helpers\SecurityHelper::escapeAttribute($player['name'] ?? '') ?>">
            </div>

            <div class="form-group">
                <label for="date_of_birth">تاریخ تولد (شمسی) *</label>
                <input type="text" class="jalali-date-input" id="date_of_birth" name="date_of_birth" required
                       value="<?= \App\Helpers\SecurityHelper::escapeAttribute($player['date_of_birth'] ?? '') ?>">
            </div>

            <div class="form-group">
                <label for="national_id">کد ملی *</label>
                <input type="text" id="national_id" name="national_id" required
                       value="<?= \App\Helpers\SecurityHelper::escapeAttribute($player['national_id'] ?? '') ?>">
            </div>

            <div class="form-group">
                <label for="position">پست *</label>
                <select id="position" name="position" required>
                    <option value="">انتخاب کنید...</option>
                    <?php foreach ($positions as $key => $label): ?>
                        <option value="<?= \App\Helpers\SecurityHelper::escapeAttribute($key) ?>"
                            <?= ($player['position'] ?? '') === $key ? 'selected' : '' ?>>
                            <?= \App\Helpers\SecurityHelper::escape($label) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group">
                <label for="classroom_id">کلاس</label>
                <select id="classroom_id" name="classroom_id">
                    <option value="">بدون کلاس...</option>
                    <?php foreach ($classrooms ?? [] as $cls): ?>
                        <option value="<?= (int)$cls['id'] ?>"
                            <?= (int)($player['classroom_id'] ?? 0) === (int)$cls['id'] ? 'selected' : '' ?>>
                            <?= \App\Helpers\SecurityHelper::escape($cls['name']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group">
                <label for="phone">تلفن</label>
                <input type="tel" id="phone" name="phone"
                       value="<?= \App\Helpers\SecurityHelper::escapeAttribute($player['phone'] ?? '') ?>">
            </div>

            <div class="form-group">
                <label for="email">ایمیل</label>
                <input type="email" id="email" name="email"
                       value="<?= \App\Helpers\SecurityHelper::escapeAttribute($player['email'] ?? '') ?>">
            </div>

            <div class="form-group form-group-full">
                <label for="notes">یادداشت</label>
                <textarea id="notes" name="notes" rows="3"><?= \App\Helpers\SecurityHelper::escape($player['notes'] ?? '') ?></textarea>
            </div>

            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" name="medical_clearance" value="1"
                        <?= !empty($player['medical_clearance']) ? 'checked' : '' ?>>
                    تأیید پزشکی
                </label>
            </div>
        </div>

        <fieldset class="upload-fieldset">
            <legend>مدارک (اختیاری)</legend>
            <div class="form-grid">
                <div class="form-group">
                    <label for="file_id">کارت شناسایی</label>
                    <input type="file" id="file_id" name="file_id" accept=".pdf,.jpg,.jpeg,.png">
                </div>
                <div class="form-group">
                    <label for="file_insurance">بیمه</label>
                    <input type="file" id="file_insurance" name="file_insurance" accept=".pdf,.jpg,.jpeg,.png">
                </div>
                <div class="form-group">
                    <label for="file_clearance">گواهی پزشکی</label>
                    <input type="file" id="file_clearance" name="file_clearance" accept=".pdf,.jpg,.jpeg,.png">
                </div>
            </div>
        </fieldset>

        <div class="form-actions">
            <button type="submit" class="btn btn-primary"><?= $isEdit ? 'ذخیره تغییرات' : 'ثبت بازیکن' ?></button>
            <a href="<?= APP_URL ?>/players" class="btn btn-secondary">انصراف</a>
        </div>
    </form>
</div>

<script>
document.getElementById('playerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.status === 403) {
            window.location.href = '<?= APP_URL ?>/403';
            return;
        }

        const data = await response.json();

        if (data.success) {
            const redirectUrl = data.redirect
                || '<?= APP_URL ?>/player/view/' + (data.player_id || '<?= (int)($player['id'] ?? 0) ?>');
            window.location.href = redirectUrl;
            return;
        }

        let msg = data.error || 'خطا در ذخیره اطلاعات';
        if (data.errors && data.errors.length) {
            msg = data.errors.join('\n');
        }
        APP.showMessage('error', msg);
    } catch (err) {
        APP.showMessage('error', 'درخواست ناموفق بود.');
    }
});
</script>
