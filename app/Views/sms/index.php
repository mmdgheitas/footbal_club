<?php
$players = $players ?? [];
$csrfToken = $csrf_token ?? '';
?>

<div class="sms-section panel">
    <div class="section-header">
        <div>
            <h3 style="margin:0;color:var(--grass-bright);">ارسال پیامک گروهی</h3>
            <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">پیام به شماره ولی بازیکنان انتخاب‌شده ارسال می‌شود</p>
        </div>
        <a href="<?= APP_URL ?>/sms/logs" class="btn btn-secondary">گزارش پیامک‌ها</a>
    </div>

    <?php if (empty($players)): ?>
        <p class="empty-message">بازیکن فعالی برای ارسال پیامک وجود ندارد.</p>
    <?php else: ?>
    <form id="smsForm" method="POST" action="<?= APP_URL ?>/sms/send">
        <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

        <div class="form-group">
            <label for="sms_type">نوع پیام</label>
            <select id="sms_type" name="sms_type">
                <option value="general">عمومی</option>
                <option value="attendance">حضور و غیاب</option>
                <option value="payment">یادآوری پرداخت</option>
                <option value="medical">پزشکی</option>
            </select>
        </div>

        <div class="form-group">
            <label>گیرندگان (ولی بازیکنان فعال)</label>
            <div class="recipients-selector">
                <label class="checkbox-label" style="margin-bottom:12px;">
                    <input type="checkbox" id="selectAllRecipients"> انتخاب همه
                </label>
                <div class="recipients-list">
                    <?php foreach ($players as $player): ?>
                    <label class="checkbox-label">
                        <input type="checkbox" name="recipients[]" value="<?= (int)$player['id'] ?>" class="recipient-checkbox">
                        <?= \App\Helpers\SecurityHelper::escape($player['name']) ?>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <div class="form-group">
            <label for="message">متن پیام (حداکثر ۱۶۰ کاراکتر)</label>
            <textarea id="message" name="message" rows="4" maxlength="160" required></textarea>
            <div style="text-align:left;font-size:0.85rem;color:var(--text-muted);margin-top:6px;">
                <span id="charCount">0</span> / 160
            </div>
        </div>

        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <button type="submit" class="btn btn-primary">ارسال پیام</button>
            <span id="sendStatus" class="send-status"></span>
        </div>
    </form>
    <?php endif; ?>
</div>

<script>
document.getElementById('selectAllRecipients')?.addEventListener('change', function() {
    document.querySelectorAll('.recipient-checkbox').forEach(cb => { cb.checked = this.checked; });
});

const messageInput = document.getElementById('message');
const charCount = document.getElementById('charCount');
messageInput?.addEventListener('input', function() {
    if (charCount) charCount.textContent = String(this.value.length);
});

document.getElementById('smsForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const form = this;
    const status = document.getElementById('sendStatus');
    status.textContent = 'در حال ارسال...';

    const headers = { 'X-Requested-With': 'XMLHttpRequest' };
    if (window.defaultCsrfToken) headers['X-CSRF-Token'] = window.defaultCsrfToken;

    fetch(form.action, { method: 'POST', body: new FormData(form), headers })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                status.style.color = 'var(--grass-bright)';
                status.textContent = data.message || 'ارسال شد.';
                form.reset();
                if (charCount) charCount.textContent = '0';
                if (typeof APP !== 'undefined') APP.showMessage('success', status.textContent);
            } else {
                status.style.color = '#ff5252';
                status.textContent = data.error || 'خطا در ارسال';
                if (typeof APP !== 'undefined') APP.showMessage('error', status.textContent);
            }
        })
        .catch(() => {
            status.style.color = '#ff5252';
            status.textContent = 'خطای شبکه';
        });
});
</script>

<style>
.recipients-selector {
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid var(--border, #2a3f5f);
    padding: 14px;
    border-radius: var(--radius-sm, 8px);
    background: rgba(0,0,0,0.15);
}
.recipients-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
}
.send-status { font-weight: 600; font-size: 0.9rem; }
</style>
