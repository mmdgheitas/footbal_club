<?php
/**
 * Attendance View
 */
$sessionDate = $session_date ?? date(DATE_FORMAT);
$players = $players ?? [];
$attendanceMap = $attendance_map ?? [];
$attendanceStatus = $attendance_status ?? [];
$csrfToken = $csrf_token ?? '';
?>

<div class="attendance-section">
    <div class="section-header">
        <h3>Session Date: <?= \App\Helpers\SecurityHelper::escape($sessionDate) ?></h3>
        <input type="date" id="sessionDate" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($sessionDate) ?>">
    </div>

    <table>
        <thead>
            <tr>
                <th>Player Name</th>
                <th>Position</th>
                <th>Age Category</th>
                <th>Attendance Status</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($players as $player): 
                $attendance = $attendanceMap[$player['id']] ?? null;
                $status = $attendance ? $attendance['status'] : 1;
            ?>
            <tr>
                <td><?= \App\Helpers\SecurityHelper::escape($player['name']) ?></td>
                <td><?= \App\Helpers\SecurityHelper::escape(PLAYER_POSITIONS[$player['position']] ?? '') ?></td>
                <td><?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? '') ?></td>
                <td>
                    <select class="attendance-select" data-player-id="<?= $player['id'] ?>">
                        <?php foreach ($attendanceStatus as $code => $label): ?>
                        <option value="<?= $code ?>" <?= $status === $code ? 'selected' : '' ?>>
                            <?= \App\Helpers\SecurityHelper::escape($label) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </td>
                <td>
                    <button class="btn btn-primary mark-attendance" data-player-id="<?= $player['id'] ?>">
                        Update
                    </button>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<script>
document.querySelectorAll('.mark-attendance').forEach(btn => {
    btn.addEventListener('click', async function() {
        const playerId = this.getAttribute('data-player-id');
        const select = document.querySelector(`select[data-player-id="${playerId}"]`);
        const status = select.value;

        try {
            const response = await APP.request('<?= APP_URL ?>/attendance/mark', {
                method: 'POST',
                body: JSON.stringify({
                    player_id: playerId,
                    session_date: document.getElementById('sessionDate').value,
                    status: status,
                    _csrf_token: '<?= \App\Helpers\SecurityHelper::escapeJs($csrfToken) ?>'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            APP.showMessage('success', 'Attendance marked successfully!');
        } catch (error) {
            APP.showMessage('error', 'Failed to mark attendance: ' + error.message);
        }
    });
});
</script>

<style>
.attendance-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

#sessionDate {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.attendance-select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.mark-attendance {
    padding: 8px 12px;
    font-size: 12px;
}
</style>
