<?php
/**
 * My Alerts View
 * Player can view alerts targeted to them
 */
use App\Helpers\SecurityHelper;

$priorityLabels = [
    'low' => 'کم',
    'medium' => 'متوسط',
    'high' => 'بالا',
    'urgent' => 'فوری',
];

?>


<div class="container-fluid">
    <div class="row">
        <div class="col-md-8 offset-md-2">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h2 class="mb-0">اعلانات من</h2>
                </div>
                <div class="card-body">
                    
                    <?php if (!empty($alerts)): ?>
                        <div class="list-group">
                            <?php foreach ($alerts as $alert): 
                                $priorityClass = [
                                    'low' => 'success',
                                    'medium' => 'primary',
                                    'high' => 'warning',
                                    'urgent' => 'danger',
                                ][$alert['priority']] ?? 'secondary';
                                
                                $isExpired = !empty($alert['expires_at']) && 
                                    strtotime($alert['expires_at']) < time();
                            ?>
                            <div class="list-group-item <?= $isExpired ? 'text-muted' : '' ?>">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div class="flex-grow-1">
                                        <div class="d-flex align-items-center gap-2 mb-2">
                                            <h5 class="mb-0">
                                                <?= SecurityHelper::escape($alert['title'] ?? 'بدون عنوان') ?>
                                                <?php if ($isExpired): ?>
                                                    <span class="badge bg-secondary">منقضی شده</span>
                                                <?php endif; ?>
                                            </h5>
                                            <span class="badge bg-<?= $priorityClass ?>">
                                                <?= $priorityLabels[$alert['priority']] ?? $alert['priority'] ?>
                                            </span>
                                        </div>
                                        <p class="mb-2">
                                            <?= nl2br(SecurityHelper::escape($alert['message'] ?? '')) ?>
                                        </p>
                                        <div class="d-flex align-items-center gap-3 text-muted small">
                                            <span>
                                                <i class="bi bi-calendar"></i> 
                                                <?= SecurityHelper::escape(date('Y/m/d H:i', strtotime($alert['created_at'] ?? ''))) ?>
                                            </span>
                                            <?php if (!empty($alert['author_name'])): ?>
                                                <span>
                                                    <i class="bi bi-person"></i> 
                                                    <?= SecurityHelper::escape($alert['author_name']) ?>
                                                </span>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    <?php else: ?>
                        <div class="alert alert-info text-center">
                            <i class="bi bi-info-circle"></i>
                            <p class="mb-0">هیچ اعلان جدیدی برای شما وجود ندارد.</p>
                        </div>
                    <?php endif; ?>
                    
                </div>
            </div>
        </div>
    </div>
</div>
