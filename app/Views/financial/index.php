<?php
/**
 * Financial Payments View
 */
$payments = $payments ?? [];
$csrfToken = $csrf_token ?? '';
$playersList = $players_list ?? [];
?>

<div class="financial-section">
    <div class="section-header" style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 15px;">
            <a href="<?= APP_URL ?>/payments" class="btn btn-primary">Payments History</a>
            <a href="<?= APP_URL ?>/reports/financial" class="btn btn-secondary">Financial Report</a>
            <a href="<?= APP_URL ?>/reports/debts" class="btn btn-secondary">Outstanding Debts</a>
        </div>
        <button id="openRecordModal" class="btn btn-primary">+ Record Payment</button>
    </div>

    <h4>Transaction History</h4>
    <?php if (empty($payments)): ?>
        <p class="empty-message">No payments recorded yet.</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Reference</th>
                    <th>Player</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($payments as $payment): ?>
                <tr>
                    <td><code><?= \App\Helpers\SecurityHelper::escape($payment['reference_number']) ?></code></td>
                    <td><?= \App\Helpers\SecurityHelper::escape($payment['player_name'] ?? '-') ?></td>
                    <td>$<?= number_format($payment['amount'], 2) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape($payment['description'] ?? '-') ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape(ucwords(str_replace('_', ' ', $payment['payment_method']))) ?></td>
                    <td><?= date('Y-m-d H:i', strtotime($payment['created_at'])) ?></td>
                    <td>
                        <a href="<?= APP_URL ?>/payment/receipt/<?= $payment['id'] ?>" target="_blank" class="btn btn-secondary btn-sm">Receipt</a>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<!-- Modal for Recording Payment -->
<div id="recordModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 1000;">
    <div class="modal-content" style="background: white; padding: 30px; border-radius: 8px; width: 500px; max-width: 90%; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <span class="close-modal" id="closeRecordModal" style="position: absolute; top: 15px; right: 20px; font-size: 24px; font-weight: bold; cursor: pointer;">&times;</span>
        <h3>Record Payment</h3>
        <form id="recordForm" method="POST" action="<?= APP_URL ?>/payment/record" style="margin-top: 20px;">
            <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label for="player_id" style="display: block; margin-bottom: 5px; font-weight: 600;">Player</label>
                <select id="player_id" name="player_id" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="">Select a player...</option>
                    <?php foreach ($playersList as $p): ?>
                        <option value="<?= $p['id'] ?>"><?= \App\Helpers\SecurityHelper::escape($p['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group" style="margin-bottom: 15px;">
                <label for="amount" style="display: block; margin-bottom: 5px; font-weight: 600;">Amount ($)</label>
                <input type="number" id="amount" name="amount" step="0.01" min="0.01" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
            </div>

            <div class="form-group" style="margin-bottom: 15px;">
                <label for="payment_method" style="display: block; margin-bottom: 5px; font-weight: 600;">Payment Method</label>
                <select id="payment_method" name="payment_method" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                </select>
            </div>

            <div class="form-group" style="margin-bottom: 20px;">
                <label for="description" style="display: block; margin-bottom: 5px; font-weight: 600;">Description</label>
                <input type="text" id="description" name="description" placeholder="Monthly tuition fee, jersey fee, etc." required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" id="cancelRecord" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Record</button>
            </div>
            <div id="recordStatus" style="margin-top: 15px; font-weight: 500; text-align: center;"></div>
        </form>
    </div>
</div>

<script>
const modal = document.getElementById('recordModal');
document.getElementById('openRecordModal').addEventListener('click', () => {
    modal.style.display = 'flex';
});

const closeModal = () => {
    modal.style.display = 'none';
    document.getElementById('recordStatus').textContent = '';
};

document.getElementById('closeRecordModal').addEventListener('click', closeModal);
document.getElementById('cancelRecord').addEventListener('click', closeModal);

document.getElementById('recordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = this;
    const status = document.getElementById('recordStatus');
    status.className = '';
    status.style.color = '#333';
    status.textContent = 'Recording transaction...';

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
            status.textContent = 'Payment recorded successfully!';
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            status.style.color = '#c5221f';
            status.textContent = data.error || 'Failed to record payment.';
        }
    })
    .catch(err => {
        status.style.color = '#c5221f';
        status.textContent = 'A network error occurred.';
    });
});
</script>

<style>
.financial-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.empty-message {
    text-align: center;
    color: #999;
    padding: 40px;
}
.btn-sm {
    padding: 5px 10px;
    font-size: 12px;
}
</style>
