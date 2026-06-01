<?php
$payments = $payments ?? [];
$csrfToken = $csrf_token ?? '';
$playersList = $players_list ?? [];
?>

<div class="financial-section panel">
    <div class="section-header">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="<?= APP_URL ?>/payments" class="btn btn-primary">💰 پرداخت‌ها</a>
            <a href="<?= APP_URL ?>/reports/financial" class="btn btn-secondary">📊 گزارش</a>
            <a href="<?= APP_URL ?>/reports/debts" class="btn btn-secondary">📌 بدهی‌ها</a>
        </div>
        <button type="button" id="openRecordModal" class="btn btn-primary">+ ثبت پرداخت</button>
    </div>

    <h4 style="color:var(--grass-bright);margin-bottom:16px;">تاریخچه تراکنش‌ها</h4>
    <?php if (empty($payments)): ?>
        <p class="empty-message">هنوز پرداختی ثبت نشده</p>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>شماره</th>
                        <th>بازیکن</th>
                        <th>مبلغ</th>
                        <th>توضیح</th>
                        <th>روش</th>
                        <th>تاریخ</th>
                        <th>رسید</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($payments as $payment): ?>
                    <tr>
                        <td><code><?= \App\Helpers\SecurityHelper::escape($payment['reference_number']) ?></code></td>
                        <td><?= \App\Helpers\SecurityHelper::escape($payment['player_name'] ?? '-') ?></td>
                        <td><strong>$<?= number_format((float)$payment['amount'], 2) ?></strong></td>
                        <td><?= \App\Helpers\SecurityHelper::escape($payment['description'] ?? '-') ?></td>
                        <td><?= \App\Helpers\SecurityHelper::escape(ucwords(str_replace('_', ' ', (string)($payment['payment_method'] ?? '-')))) ?></td>
                        <td><?= date('Y-m-d H:i', strtotime($payment['created_at'])) ?></td>
                        <td>
                            <a href="<?= APP_URL ?>/payment/receipt/<?= $payment['id'] ?>" target="_blank" class="btn btn-secondary btn-sm">رسید</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<div id="recordModal" class="modal">
    <div class="modal-content" style="position:relative;">
        <button type="button" class="close-modal" id="closeRecordModal">&times;</button>
        <h3 style="margin-bottom:20px;color:var(--grass-bright);">💵 ثبت پرداخت جدید</h3>
        <form id="recordForm" method="POST" action="<?= APP_URL ?>/payment/record" data-ajax="true">
            <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

            <div class="form-group">
                <label for="player_id">بازیکن</label>
                <select id="player_id" name="player_id" required>
                    <option value="">انتخاب کنید...</option>
                    <?php foreach ($playersList as $p): ?>
                        <option value="<?= $p['id'] ?>"><?= \App\Helpers\SecurityHelper::escape($p['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group">
                <label for="amount">مبلغ ($)</label>
                <input type="number" id="amount" name="amount" step="0.01" min="0.01" required>
            </div>

            <div class="form-group">
                <label for="payment_method">روش پرداخت</label>
                <select id="payment_method" name="payment_method" required>
                    <option value="cash">نقدی</option>
                    <option value="bank_transfer">انتقال بانکی</option>
                    <option value="credit_card">کارت</option>
                </select>
            </div>

            <div class="form-group">
                <label for="description">توضیحات</label>
                <input type="text" id="description" name="description" placeholder="شهریه، لباس، ..." required>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" id="cancelRecord" class="btn btn-secondary">انصراف</button>
                <button type="submit" class="btn btn-primary">ثبت ✓</button>
            </div>
        </form>
    </div>
</div>

<script>
const recordModal = document.getElementById('recordModal');
document.getElementById('cancelRecord')?.addEventListener('click', () => {
    recordModal.classList.remove('is-open');
    recordModal.style.display = 'none';
});
document.getElementById('recordForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const form = this;
    const btn = form.querySelector('[type="submit"]');
    btn.classList.add('loading');
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                APP.showMessage('success', 'پرداخت ثبت شد! 💰');
                setTimeout(() => location.reload(), 900);
            } else {
                APP.showMessage('error', data.error || 'خطا در ثبت');
            }
        })
        .catch(() => APP.showMessage('error', 'خطای شبکه'))
        .finally(() => btn.classList.remove('loading'));
});
</script>
