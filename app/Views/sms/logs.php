<?php
$logs = $logs ?? [];
$filter = $filter ?? 'all';
$statusLabels = [
    'pending' => 'در انتظار',
    'sent' => 'ارسال شده',
    'delivered' => 'تحویل شده',
    'failed' => 'ناموفق',
];
?>

<div class="sms-section panel">
    <div class="section-header">
        <h3 style="margin:0;color:var(--grass-bright);">گزارش پیامک‌ها</h3>
        <form method="GET" class="filter-form" style="display:flex;gap:8px;align-items:center;">
            <select name="filter">
                <option value="all" <?= $filter === 'all' ? 'selected' : '' ?>>همه</option>
                <option value="sent" <?= $filter === 'sent' ? 'selected' : '' ?>>ارسال شده</option>
                <option value="pending" <?= $filter === 'pending' ? 'selected' : '' ?>>در انتظار</option>
                <option value="failed" <?= $filter === 'failed' ? 'selected' : '' ?>>ناموفق</option>
            </select>
            <button type="submit" class="btn btn-secondary btn-sm">فیلتر</button>
            <a href="<?= APP_URL ?>/sms/send" class="btn btn-primary btn-sm">ارسال جدید</a>
        </form>
    </div>

    <?php if (empty($logs)): ?>
        <p class="empty-message">پیامکی ثبت نشده است.</p>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>گیرنده</th>
                        <th>پیام</th>
                        <th>نوع</th>
                        <th>وضعیت</th>
                        <th>تاریخ</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($logs as $log):
                        $msg = (string)($log['message'] ?? '');
                        $preview = mb_strlen($msg) > 50 ? mb_substr($msg, 0, 50) . '…' : $msg;
                        $status = (string)($log['status'] ?? '');
                    ?>
                    <tr>
                        <td><code><?= \App\Helpers\SecurityHelper::escape($log['recipient_phone'] ?? '') ?></code></td>
                        <td><?= \App\Helpers\SecurityHelper::escape($preview) ?></td>
                        <td><?= \App\Helpers\SecurityHelper::escape($log['sms_type'] ?? '-') ?></td>
                        <td>
                            <span class="status-pill <?= $status === 'failed' ? 'status-absent' : 'status-present' ?>">
                                <?= \App\Helpers\SecurityHelper::escape($statusLabels[$status] ?? $status) ?>
                            </span>
                        </td>
                        <td><?= !empty($log['created_at']) ? date('Y-m-d H:i', strtotime($log['created_at'])) : '—' ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
