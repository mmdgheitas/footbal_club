<?php
/**
 * Medical Records View with edit form
 */
$medical = $medical ?? [];
$injuries = $injuries ?? [];
$player = $player ?? [];
$csrfToken = $csrf_token ?? '';
$playerId = (int)($player['id'] ?? 0);
$canEdit = \App\Middleware\RbacMiddleware::hasPermission('view_medical');
?>
<div class="medical-section panel">
    <div class="section-toolbar">
        <a href="<?= APP_URL ?>/medical" class="btn btn-secondary">بازگشت به لیست</a>
        <a href="<?= APP_URL ?>/player/view/<?= $playerId ?>" class="btn btn-secondary">پروفایل بازیکن</a>
    </div>

    <h3>پرونده پزشکی — <?= \App\Helpers\SecurityHelper::escape($player['name'] ?? '') ?></h3>

    <?php if ($canEdit): ?>
    <form id="medicalForm" method="POST" action="<?= APP_URL ?>/medical/update/<?= $playerId ?>" data-ajax="true" class="medical-form">
        <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

        <div class="form-grid">
            <div class="form-group">
                <label for="blood_type">گروه خونی</label>
                <input type="text" id="blood_type" name="blood_type"
                       value="<?= \App\Helpers\SecurityHelper::escapeAttribute($medical['blood_type'] ?? '') ?>">
            </div>
            <div class="form-group">
                <label for="vaccination_status">وضعیت واکسیناسیون</label>
                <input type="text" id="vaccination_status" name="vaccination_status"
                       value="<?= \App\Helpers\SecurityHelper::escapeAttribute($medical['vaccination_status'] ?? '') ?>">
            </div>
            <div class="form-group">
                <label for="last_exam_date">آخرین معاینه</label>
                <input type="date" id="last_exam_date" name="last_exam_date"
                       value="<?= \App\Helpers\SecurityHelper::escapeAttribute($medical['last_exam_date'] ?? '') ?>">
            </div>
            <div class="form-group form-group-full">
                <label for="allergies">آلرژی‌ها</label>
                <textarea id="allergies" name="allergies" rows="2"><?= \App\Helpers\SecurityHelper::escape($medical['allergies'] ?? '') ?></textarea>
            </div>
            <div class="form-group form-group-full">
                <label for="medical_conditions">بیماری‌های زمینه‌ای</label>
                <textarea id="medical_conditions" name="medical_conditions" rows="2"><?= \App\Helpers\SecurityHelper::escape($medical['medical_conditions'] ?? '') ?></textarea>
            </div>
            <div class="form-group form-group-full">
                <label for="exam_notes">یادداشت معاینه</label>
                <textarea id="exam_notes" name="exam_notes" rows="3"><?= \App\Helpers\SecurityHelper::escape($medical['exam_notes'] ?? '') ?></textarea>
            </div>
        </div>

        <button type="submit" class="btn btn-primary">ذخیره پرونده</button>
    </form>
    <?php else: ?>
    <div class="medical-info">
        <div class="info-group">
            <label>گروه خونی:</label>
            <span><?= \App\Helpers\SecurityHelper::escape($medical['blood_type'] ?? 'ثبت نشده') ?></span>
        </div>
        <div class="info-group">
            <label>آلرژی‌ها:</label>
            <span><?= \App\Helpers\SecurityHelper::escape($medical['allergies'] ?? 'ندارد') ?></span>
        </div>
        <div class="info-group">
            <label>بیماری‌های زمینه‌ای:</label>
            <span><?= \App\Helpers\SecurityHelper::escape($medical['medical_conditions'] ?? 'ندارد') ?></span>
        </div>
        <div class="info-group">
            <label>وضعیت واکسیناسیون:</label>
            <span><?= \App\Helpers\SecurityHelper::escape($medical['vaccination_status'] ?? 'ثبت نشده') ?></span>
        </div>
        <div class="info-group">
            <label>آخرین معاینه:</label>
            <span><?= !empty($medical['last_exam_date']) ? \App\Helpers\SecurityHelper::escape($medical['last_exam_date']) : 'ثبت نشده' ?></span>
        </div>
    </div>
    <?php endif; ?>

    <h4>سوابق مصدومیت</h4>
    <?php if (empty($injuries)): ?>
        <p>مصدومیت ثبت نشده است.</p>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>نوع</th>
                        <th>شدت</th>
                        <th>تاریخ</th>
                        <th>بهبود</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($injuries as $injury): ?>
                    <tr>
                        <td><?= \App\Helpers\SecurityHelper::escape($injury['injury_type'] ?? '') ?></td>
                        <td><?= \App\Helpers\SecurityHelper::escape(ucfirst((string)($injury['severity'] ?? ''))) ?></td>
                        <td><?= \App\Helpers\SecurityHelper::escape($injury['date_of_injury'] ?? '') ?></td>
                        <td><?= !empty($injury['recovery_date']) ? \App\Helpers\SecurityHelper::escape($injury['recovery_date']) : 'در جریان' ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<script>
document.getElementById('medicalForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const headers = { 'X-Requested-With': 'XMLHttpRequest' };
    if (window.defaultCsrfToken) headers['X-CSRF-Token'] = window.defaultCsrfToken;
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers,
        });
        if (response.status === 403) {
            window.location.href = '<?= APP_URL ?>/403';
            return;
        }
        const data = await response.json();
        if (data.success) {
            APP.showMessage('success', 'پرونده پزشکی ذخیره شد.');
        } else {
            APP.showMessage('error', data.error || 'خطا در ذخیره');
        }
    } catch (err) {
        APP.showMessage('error', 'درخواست ناموفق بود.');
    }
});
</script>

<style>
.section-toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}
.medical-form { margin: 20px 0; padding: 20px; background: rgba(0,0,0,0.12); border-radius: var(--radius-sm, 8px); border: 1px solid var(--border, #2a3f5f); }
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
}
.form-group-full { grid-column: 1 / -1; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; }
.form-group input, .form-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
}
.medical-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin: 20px 0;
    background: #f9f9f9;
    padding: 15px;
    border-radius: 4px;
}
.info-group { display: flex; flex-direction: column; }
.info-group label { font-weight: 600; color: #555; margin-bottom: 5px; }
h4 { margin: 24px 0 15px 0; color: var(--grass-bright); }
</style>
