<?php
$sessionDate = $session_date ?? date(DATE_FORMAT);
$players = $players ?? [];
$attendanceMap = $attendance_map ?? [];
$attendanceStatus = $attendance_status ?? ATTENDANCE_STATUS_LABELS;
$csrfToken = $csrf_token ?? '';
$statusClass = [1 => 'status-present', 2 => 'status-absent', 3 => 'status-excused', 4 => 'status-late'];
?>

<div class="attendance-section panel">
    <div class="section-header">
        <div>
            <h3 style="margin:0;color:var(--grass-bright);">📋 حضور و غیاب</h3>
            <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">تاریخ جلسه را انتخاب کن و وضعیت هر بازیکن را ثبت کن</p>
        </div>
        <div class="form-group" style="margin:0;min-width:180px;">
            <label for="sessionDate">📅 تاریخ</label>
            <input type="date" id="sessionDate" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($sessionDate) ?>">
        </div>
    </div>

    <?php if (empty($players)): ?>
        <p class="empty-message">بازیکن فعالی برای ثبت حضور وجود ندارد</p>
    <?php else: ?>
        <div class="table-wrap">
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
document.getElementById('sessionDate')?.addEventListener('change', function() {
    window.location.href = '<?= APP_URL ?>/attendance?date=' + this.value;
});

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
