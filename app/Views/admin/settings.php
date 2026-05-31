<?php
/**
 * Admin Settings View
 */
$csrfToken = $csrf_token ?? '';

// Fetch all settings from database to display current values
$settingsRows = $this->db->findAll("SELECT * FROM fc_settings");
$currentSettings = [];
foreach ($settingsRows as $row) {
    $currentSettings[$row['setting_key']] = $row['setting_value'];
}

$appName = $currentSettings['app_name'] ?? 'Football Club Manager';
$attendanceThreshold = $currentSettings['attendance_warning_threshold'] ?? '75';
$maxUploadSize = $currentSettings['max_upload_size'] ?? '10485760';
$smsProvider = $currentSettings['sms_provider'] ?? 'twilio';
?>

<div class="settings-section">
    <div class="admin-nav" style="margin-bottom: 25px; display: flex; gap: 15px;">
        <a href="<?= APP_URL ?>/admin/users" class="btn btn-secondary">User Management</a>
        <a href="<?= APP_URL ?>/admin/settings" class="btn btn-primary">Settings</a>
    </div>

    <form id="settingsForm" method="POST" action="<?= APP_URL ?>/admin/settings" class="settings-form">
        <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

        <div class="form-group">
            <label for="app_name">Application Name</label>
            <input type="text" id="app_name" name="app_name" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($appName) ?>" required>
        </div>

        <div class="form-group">
            <label for="attendance_warning_threshold">Attendance Warning Threshold (%)</label>
            <input type="number" id="attendance_warning_threshold" name="attendance_warning_threshold" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($attendanceThreshold) ?>" min="0" max="100" required>
        </div>

        <div class="form-group">
            <label for="max_upload_size">Maximum Upload Size (Bytes)</label>
            <input type="number" id="max_upload_size" name="max_upload_size" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($maxUploadSize) ?>" required>
        </div>

        <div class="form-group">
            <label for="sms_provider">SMS Provider</label>
            <select id="sms_provider" name="sms_provider">
                <option value="twilio" <?= $smsProvider === 'twilio' ? 'selected' : '' ?>>Twilio</option>
                <option value="nexmo" <?= $smsProvider === 'nexmo' ? 'selected' : '' ?>>Nexmo (Vonage)</option>
                <option value="log" <?= $smsProvider === 'log' ? 'selected' : '' ?>>Log Only (Mock)</option>
            </select>
        </div>

        <button type="submit" class="btn btn-primary">Save Settings</button>
        <span id="saveStatus" class="save-status"></span>
    </form>
</div>

<script>
document.getElementById('settingsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = this;
    const status = document.getElementById('saveStatus');
    status.className = 'save-status';
    status.textContent = 'Saving...';

    const formData = new FormData(form);

    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            status.className = 'save-status success';
            status.textContent = data.message || 'Settings saved successfully!';
        } else {
            status.className = 'save-status error';
            status.textContent = data.error || 'Failed to save settings.';
        }
    })
    .catch(err => {
        status.className = 'save-status error';
        status.textContent = 'A network error occurred.';
    });
});
</script>

<style>
.settings-section {
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    max-width: 600px;
}
.form-group {
    margin-bottom: 20px;
}
.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
}
.form-group input, .form-group select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
}
.save-status {
    margin-left: 15px;
    font-size: 14px;
    font-weight: 500;
}
.save-status.success {
    color: #137333;
}
.save-status.error {
    color: #c5221f;
}
</style>
