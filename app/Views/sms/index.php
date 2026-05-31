<?php
/**
 * Send SMS View
 */
$players = $players ?? [];
$csrfToken = $csrf_token ?? '';
?>

<div class="sms-section">
    <div class="section-header" style="margin-bottom: 20px; display: flex; gap: 15px; align-items: center; justify-content: space-between;">
        <h3>Send Bulk SMS</h3>
        <a href="<?= APP_URL ?>/sms/logs" class="btn btn-secondary">View SMS Logs</a>
    </div>

    <form id="smsForm" method="POST" action="<?= APP_URL ?>/sms/send" class="sms-form">
        <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

        <div class="form-group">
            <label for="sms_type">Message Type</label>
            <select id="sms_type" name="sms_type">
                <option value="general">General Notification</option>
                <option value="attendance">Attendance Alert</option>
                <option value="payment">Payment Reminder</option>
                <option value="medical">Medical Update</option>
            </select>
        </div>

        <div class="form-group">
            <label>Recipients (Active Players' Guardians)</label>
            <div class="recipients-selector" style="max-height: 250px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 4px; background: #fafafa;">
                <div style="margin-bottom: 10px;">
                    <label style="font-weight: 500; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="selectAllRecipients"> <strong>Select All Players</strong>
                    </label>
                </div>
                <div class="recipients-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                    <?php foreach ($players as $player): ?>
                        <label style="display: inline-flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer;">
                            <input type="checkbox" name="recipients[]" value="<?= $player['id'] ?>" class="recipient-checkbox">
                            <?= \App\Helpers\SecurityHelper::escape($player['name']) ?>
                        </label>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <div class="form-group">
            <label for="message">Message (Max 160 characters)</label>
            <textarea id="message" name="message" rows="4" maxlength="160" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
            <div style="text-align: right; font-size: 12px; color: #666; margin-top: 5px;">
                <span id="charCount">0</span> / 160 characters
            </div>
        </div>

        <button type="submit" class="btn btn-primary">Send Message</button>
        <span id="sendStatus" class="send-status" style="margin-left: 15px; font-weight: 500;"></span>
    </form>
</div>

<script>
document.getElementById('selectAllRecipients').addEventListener('change', function() {
    const checked = this.checked;
    document.querySelectorAll('.recipient-checkbox').forEach(cb => {
        cb.checked = checked;
    });
});

const messageInput = document.getElementById('message');
const charCount = document.getElementById('charCount');
messageInput.addEventListener('input', function() {
    charCount.textContent = this.value.length;
});

document.getElementById('smsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = this;
    const status = document.getElementById('sendStatus');
    status.className = 'send-status';
    status.style.color = '#333';
    status.textContent = 'Sending messages...';

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
            status.style.color = '#137333';
            status.textContent = data.message || 'Messages sent successfully!';
            form.reset();
            charCount.textContent = '0';
        } else {
            status.style.color = '#c5221f';
            status.textContent = data.error || 'Failed to send messages.';
        }
    })
    .catch(err => {
        status.style.color = '#c5221f';
        status.textContent = 'A network error occurred.';
    });
});
</script>

<style>
.sms-section {
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
.form-group select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
}
</style>
