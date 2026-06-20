<?php
/**
 * Player Panel - Financial View
 */
$payments = $payments ?? [];
$outstanding = $total_outstanding ?? 0;
$paid = $total_paid ?? 0;
?>

<div style="margin-bottom: 24px;">
    <p style="color: #666; font-size: 15px;">در این بخش می‌توانید لیست تراکنش‌ها، مبالغ پرداختی و بدهی‌های معوقه خود را مشاهده کنید.</p>
</div>

<!-- Financial Summary -->
<div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 30px;">
    <!-- Outstanding Debt Box -->
    <div style="flex: 1; min-width: 240px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 20px; border-right: 4px solid <?= $outstanding > 0 ? '#ff4757' : '#2ed573' ?>;">
        <span style="font-size: 13px; color: #888; display: block; margin-bottom: 8px; font-weight: 600;">بدهی معوقه (بدهکار)</span>
        <h3 style="font-size: 24px; font-weight: 700; margin: 0; color: <?= $outstanding > 0 ? '#ff4757' : '#2ed573' ?>;">
            <?= number_format($outstanding) ?> ریال
        </h3>
    </div>

    <!-- Total Paid Box -->
    <div style="flex: 1; min-width: 240px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 20px; border-right: 4px solid #2ed573;">
        <span style="font-size: 13px; color: #888; display: block; margin-bottom: 8px; font-weight: 600;">مجموع پرداختی‌ها (بستانکار)</span>
        <h3 style="font-size: 24px; font-weight: 700; margin: 0; color: #2ed573;">
            <?= number_format($paid) ?> ریال
        </h3>
    </div>
</div>

<!-- Transaction Ledger Card -->
<div class="card" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 24px;">
    <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 20px 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 12px;">📊 لیست تراکنش‌ها و قبوض</h3>

    <?php if (empty($payments)): ?>
        <p style="color: #888; text-align: center; padding: 30px 0;">تراکنشی برای حساب شما ثبت نشده است.</p>
    <?php else: ?>
        <div style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: collapse; text-align: right;">
                <thead>
                    <tr style="border-bottom: 2px solid #eee;">
                        <th style="padding: 12px 8px; font-weight: 600; color: #888;">کد مرجع</th>
                        <th style="padding: 12px 8px; font-weight: 600; color: #888;">شرح</th>
                        <th style="padding: 12px 8px; font-weight: 600; color: #888;">مبلغ</th>
                        <th style="padding: 12px 8px; font-weight: 600; color: #888;">روش پرداخت</th>
                        <th style="padding: 12px 8px; font-weight: 600; color: #888;">تاریخ</th>
                        <th style="padding: 12px 8px; font-weight: 600; color: #888;">وضعیت</th>
                        <th style="padding: 12px 8px; font-weight: 600; color: #888; text-align: center;">عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($payments as $payment): ?>
                        <tr style="border-bottom: 1px solid #f1f2f6; transition: background 0.2s;">
                            <td style="padding: 14px 8px; font-family: monospace; font-size: 13px;">
                                <?= \App\Helpers\SecurityHelper::escape($payment['reference_number'] ?? '-') ?>
                            </td>
                            <td style="padding: 14px 8px; font-size: 14px;">
                                <?= \App\Helpers\SecurityHelper::escape($payment['description'] ?? 'شهریه') ?>
                            </td>
                            <td style="padding: 14px 8px; font-weight: 600; font-size: 14px;">
                                <?= number_format((float)$payment['amount']) ?> ریال
                            </td>
                            <td style="padding: 14px 8px; font-size: 13px; color: #555;">
                                <?= \App\Helpers\SecurityHelper::escape($payment['payment_method'] ?? '-') ?>
                            </td>
                            <td style="padding: 14px 8px; font-size: 13px; color: #777;">
                                <?= date(DISPLAY_DATE_FORMAT, strtotime($payment['created_at'])) ?>
                            </td>
                            <td style="padding: 14px 8px;">
                                <?php
                                $status = $payment['status'];
                                $badgeColor = '#ffa502';
                                if ($status === 'completed') $badgeColor = '#2ed573';
                                elseif ($status === 'failed') $badgeColor = '#ff4757';
                                elseif ($status === 'refunded') $badgeColor = '#70a1ff';
                                ?>
                                <span class="badge" style="background: <?= $badgeColor ?>; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-block;">
                                    <?= \App\Helpers\SecurityHelper::escape(PAYMENT_STATUSES[$status] ?? $status) ?>
                                </span>
                            </td>
                            <td style="padding: 14px 8px; text-align: center;">
                                <?php if ($status === 'completed'): ?>
                                    <a href="<?= APP_URL ?>/payment/receipt/<?= $payment['id'] ?>" target="_blank" class="btn btn-sm btn-outline" style="font-size: 11px; padding: 4px 10px; border: 1px solid #3498db; border-radius: 4px; color: #3498db; text-decoration: none; font-weight: 600;">📄 رسید پرداخت</a>
                                <?php else: ?>
                                    <span style="font-size: 12px; color: #ccc;">-</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
