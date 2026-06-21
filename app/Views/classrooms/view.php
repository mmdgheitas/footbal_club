<?php
/**
 * Classroom view (roster management)
 */
$classroom = $classroom ?? [];
$roster = $roster ?? [];
$availablePlayers = $available_players ?? [];
$csrfToken = $csrf_token ?? '';
?>

<div class="form-toolbar" style="margin-bottom:16px;">
    <a href="<?= APP_URL ?>/classrooms" class="btn btn-secondary">← بازگشت به لیست کلاس‌ها</a>
</div>

<div class="classroom-view-grid" style="display:grid;grid-template-columns: 2fr 1fr;gap:24px;">
    <!-- Classroom Roster -->
    <div class="roster-panel panel" style="margin:0;">
        <div class="section-header">
            <div>
                <h3 style="margin:0;color:var(--grass-bright);">📋 لیست بازیکنان کلاس</h3>
                <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">تعداد کل بازیکنان این کلاس: <?= count($roster) ?> نفر</p>
            </div>
        </div>

        <?php if (empty($roster)): ?>
            <p class="empty-message">هیچ بازیکنی در این کلاس حضور ندارد. از پنل سمت چپ بازیکنان را اضافه کنید.</p>
        <?php else: ?>
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>نام بازیکن</th>
                            <th>پست</th>
                            <th>رده سنی</th>
                            <th>کد ملی</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($roster as $player): ?>
                        <tr>
                            <td><strong><?= \App\Helpers\SecurityHelper::escape($player['name']) ?></strong></td>
                            <td><?= \App\Helpers\SecurityHelper::escape(PLAYER_POSITIONS[$player['position']] ?? $player['position']) ?></td>
                            <td><?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? '') ?></td>
                            <td><code><?= \App\Helpers\SecurityHelper::escape($player['national_id']) ?></code></td>
                            <td>
                                <form method="POST" action="<?= APP_URL ?>/classroom/remove-player/<?= (int)$classroom['id'] ?>" style="display:inline;" data-confirm="آیا از حذف این بازیکن از کلاس مطمئن هستید؟">
                                    <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">
                                    <input type="hidden" name="player_id" value="<?= (int)$player['id'] ?>">
                                    <button type="submit" class="btn btn-danger btn-sm">❌ حذف از کلاس</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>

    <!-- Add Player Panel -->
    <div class="add-player-panel panel" style="margin:0;align-self:start;">
        <div class="section-header">
            <h3 style="margin:0;color:var(--white);">➕ افزودن بازیکن جدید</h3>
        </div>

        <?php if (empty($availablePlayers)): ?>
            <p class="muted" style="text-align:center;padding:16px;">تمام بازیکنان فعال باشگاه در حال حاضر کلاس‌بندی شده‌اند.</p>
        <?php else: ?>
            <form id="addPlayerForm" method="POST" action="<?= APP_URL ?>/classroom/add-player/<?= (int)$classroom['id'] ?>">
                <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">
                
                <div class="form-group" style="margin-bottom:16px;">
                    <label for="player_id">انتخاب بازیکن</label>
                    <select id="player_id" name="player_id" required style="width:100%;">
                        <option value="">یک بازیکن انتخاب کنید...</option>
                        <?php foreach ($availablePlayers as $ap):
                            $classroomLabel = $ap['classroom_id'] ? ' (کلاس دیگر)' : ' (بدون کلاس)';
                        ?>
                            <option value="<?= (int)$ap['id'] ?>">
                                <?= \App\Helpers\SecurityHelper::escape($ap['name']) ?> - <?= \App\Helpers\SecurityHelper::escape(PLAYER_POSITIONS[$ap['position']] ?? '') ?><?= $classroomLabel ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <button type="submit" class="btn btn-primary" style="width:100%;">افزودن بازیکن به کلاس</button>
            </form>
        <?php endif; ?>
    </div>
</div>

<script>
document.getElementById('addPlayerForm')?.addEventListener('submit', async function(e) {
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
                window.location.reload();
            }, 600);
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

<style>
@media (max-width: 768px) {
    .classroom-view-grid {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
    }
}
</style>
