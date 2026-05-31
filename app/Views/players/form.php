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
<div class="player-form-section">
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
                <label for="date_of_birth">تاریخ تولد *</label>
                <input type="date" id="date_of_birth" name="date_of_birth" required
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

<style>
.player-form-section {
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.form-toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 24px;
}
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
}
.form-group-full { grid-column: 1 / -1; }
.form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    color: #444;
}
.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
}
.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: normal;
}
.upload-fieldset {
    margin: 24px 0;
    padding: 16px;
    border: 1px solid #eee;
    border-radius: 8px;
}
.upload-fieldset legend {
    padding: 0 8px;
    font-weight: 600;
}
.form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}
</style>
