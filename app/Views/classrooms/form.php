<?php
$classroom = $classroom ?? null;
$csrfToken = $csrf_token ?? '';
$isEdit = $classroom !== null;
$formAction = $isEdit
    ? APP_URL . '/classroom/update/' . (int)$classroom['id']
    : APP_URL . '/classroom/store';
$pageHeading = $isEdit ? 'ویرایش کلاس' : 'افزودن کلاس جدید';
?>

<div class="classroom-form-section panel">
    <div class="form-toolbar">
        <a href="<?= APP_URL ?>/classrooms" class="btn btn-secondary">بازگشت به لیست</a>
    </div>

    <form id="classroomForm" method="POST" action="<?= \App\Helpers\SecurityHelper::escapeAttribute($formAction) ?>" data-ajax="true">
        <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

        <div class="form-grid">
            <div class="form-group form-group-full">
                <label for="name">نام کلاس *</label>
                <input type="text" id="name" name="name" required
                       value="<?= \App\Helpers\SecurityHelper::escapeAttribute($classroom['name'] ?? '') ?>" placeholder="مثال: زیر ۱۰ سال الف">
            </div>

            <div class="form-group form-group-full">
                <label for="description">توضیحات</label>
                <textarea id="description" name="description" rows="4" placeholder="توضیحات مربوط به روزها و ساعت تمرین یا سطح کلاس..."><?= \App\Helpers\SecurityHelper::escape($classroom['description'] ?? '') ?></textarea>
            </div>
        </div>

        <div class="form-actions">
            <button type="submit" class="btn btn-primary"><?= $isEdit ? 'ذخیره تغییرات' : 'ایجاد کلاس' ?></button>
            <a href="<?= APP_URL ?>/classrooms" class="btn btn-secondary">انصراف</a>
        </div>
    </form>
</div>

<script>
document.getElementById('classroomForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.classList.add('loading');

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.status === 403) {
            window.location.href = '<?= APP_URL ?>/403';
            return;
        }

        const data = await response.json();

        if (data.success) {
            APP.showMessage('success', data.message || 'انجام شد!');
            setTimeout(() => {
                window.location.href = data.redirect || '<?= APP_URL ?>/classrooms';
            }, 800);
            return;
        }

        let msg = data.error || 'خطا در ثبت اطلاعات';
        APP.showMessage('error', msg);
    } catch (err) {
        APP.showMessage('error', 'درخواست ناموفق بود.');
    } finally {
        if (submitBtn) submitBtn.classList.remove('loading');
    }
});
</script>
