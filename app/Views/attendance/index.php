<?php
$sessionDate = $session_date ?? date(DATE_FORMAT);
$sessionDateJalali = $session_date_jalali ?? '';
$classrooms = $classrooms ?? [];
$selectedClassroomId = $selected_classroom_id ?? 0;
$players = $players ?? [];
$attendanceMap = $attendance_map ?? [];
$attendanceStatus = $attendance_status ?? ATTENDANCE_STATUS_LABELS;
$csrfToken = $csrf_token ?? '';
$statusClass = [1 => 'status-present', 2 => 'status-absent', 3 => 'status-excused', 4 => 'status-late'];
?>

<div class="attendance-section panel">
    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div>
            <h3 style="margin:0;color:var(--grass-bright);"><span aria-hidden="true">📋</span> حضور و غیاب</h3>
            <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">کلاس و تاریخ جلسه را انتخاب کنید و وضعیت حضور بازیکنان را ثبت کنید</p>
        </div>
        
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
            <div class="form-group" style="margin:0;min-width:180px;">
                <label for="classroomId">🏫 کلاس (تیم)</label>
                <select id="classroomId" style="padding:8px 12px;width:100%;background-color:var(--navy-light);color:var(--white);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-family:inherit;">
                    <?php if (empty($classrooms)): ?>
                        <option value="">بدون کلاس...</option>
                    <?php else: ?>
                        <?php foreach ($classrooms as $cls): ?>
                            <option value="<?= (int)$cls['id'] ?>" <?= $selectedClassroomId === (int)$cls['id'] ? 'selected' : '' ?>>
                                <?= \App\Helpers\SecurityHelper::escape($cls['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </select>
            </div>
            
            <div class="form-group" style="margin:0;min-width:150px;">
                <label for="sessionDate">📅 تاریخ جلسه (شمسی)</label>
                <input type="text" class="jalali-date-input" id="sessionDate" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($sessionDateJalali) ?>" style="padding:8px 12px;background-color:var(--navy-light);color:var(--white);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-family:inherit;">
            </div>
            
            <button type="button" class="btn btn-secondary" id="btnChangeDate" style="height:38px;padding:0 16px;">نمایش</button>
        </div>
    </div>

    <?php if (empty($players)): ?>
        <p class="empty-message" style="margin-top:24px;">بازیکنی در کلاس انتخابی عضو نیست یا کلاسی تعریف نشده است.</p>
    <?php else: ?>
        <div class="table-wrap" style="margin-top:16px;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>بازیکن</th>
                        <th>پست</th>
                        <th>رده</th>
                        <th>وضعیت</th>
                        <th>ثبت</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($players as $player):
                        $attendance = $attendanceMap[$player['id']] ?? null;
                        $status = $attendance ? (int)$attendance['status'] : 1;
                    ?>
                    <tr data-player-row="<?= $player['id'] ?>">
                        <td><strong><?= \App\Helpers\SecurityHelper::escape($player['name']) ?></strong></td>
                        <td><?= \App\Helpers\SecurityHelper::escape(PLAYER_POSITIONS[$player['position']] ?? '') ?></td>
                        <td><?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? '') ?></td>
                        <td>
                            <select class="attendance-select" data-player-id="<?= $player['id'] ?>">
                                <?php foreach ($attendanceStatus as $code => $label): ?>
                                <option value="<?= (int)$code ?>" <?= $status === (int)$code ? 'selected' : '' ?>>
                                    <?= \App\Helpers\SecurityHelper::escape($label) ?>
                                </option>
                                <?php endforeach; ?>
                            </select>
                            <span class="status-pill <?= $statusClass[$status] ?? '' ?>" style="margin-top:6px;display:inline-block;">
                                <?= \App\Helpers\SecurityHelper::escape($attendanceStatus[$status] ?? '') ?>
                            </span>
                        </td>
                        <td>
                            <button type="button" class="btn btn-primary btn-sm mark-attendance" data-player-id="<?= $player['id'] ?>">
                                ✓ ثبت
                            </button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<script>
const reloadGrid = () => {
    const classId = document.getElementById('classroomId').value;
    const dateVal = document.getElementById('sessionDate').value;
    window.location.href = '<?= APP_URL ?>/attendance?classroom_id=' + classId + '&date=' + encodeURIComponent(dateVal);
};

document.getElementById('btnChangeDate')?.addEventListener('click', reloadGrid);
document.getElementById('classroomId')?.addEventListener('change', reloadGrid);

document.querySelectorAll('.mark-attendance').forEach(btn => {
    btn.addEventListener('click', async function() {
        const playerId = this.getAttribute('data-player-id');
        const select = document.querySelector(`select[data-player-id="${playerId}"]`);
        const status = select.value;
        const row = document.querySelector(`tr[data-player-row="${playerId}"]`);

        this.classList.add('loading');
        try {
            await APP.request('<?= APP_URL ?>/attendance/mark', {
                method: 'POST',
                body: JSON.stringify({
                    player_id: playerId,
                    session_date: document.getElementById('sessionDate').value,
                    status: parseInt(status, 10),
                    _csrf_token: '<?= \App\Helpers\SecurityHelper::escapeJs($csrfToken) ?>'
                }),
            });
            this.classList.remove('loading');
            this.classList.add('success-pulse', 'celebrate');
            if (row) {
                row.classList.add('row-pop');
                row.classList.add('is-visible');
            }
            APP.showMessage('success', 'حضور ثبت شد! ⚽');
            setTimeout(() => this.classList.remove('success-pulse'), 600);
        } catch (error) {
            this.classList.remove('loading');
            APP.showMessage('error', 'خطا: ' + error.message);
        }
    });
});
</script>
