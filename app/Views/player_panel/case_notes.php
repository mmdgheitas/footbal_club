<?php
/**
 * Player Panel - Case Notes View
 */
use App\Helpers\SecurityHelper;

$noteTypeLabels = [
    'general' => 'عمومی',
    'medical' => 'پزشکی',
    'disciplinary' => 'انظباطی',
    'achievement' => 'دستاورد',
    'concern' => 'نگرانی',
];

$severityLabels = [
    'low' => 'کم',
    'medium' => 'متوسط',
    'high' => 'بالا',
];

?>

<?php include __DIR__ . '/../layouts/main.php'; ?>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h2 class="mb-0">یادداشت‌های پرونده من</h2>
                </div>
                <div class="card-body">
                    
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i>
                        <span>این یادداشت‌ها توسط مدیران و مربیان برای پرونده شما ثبت شده‌اند.</span>
                    </div>
                    
                    <?php if (!empty($case_notes)): ?>
                        <div class="list-group">
                            <?php foreach ($case_notes as $note): 
                                $severityClass = [
                                    'low' => 'success',
                                    'medium' => 'warning',
                                    'high' => 'danger',
                                ][$note['severity']] ?? 'secondary';
                            ?>
                            <div class="list-group-item">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div class="flex-grow-1">
                                        <div class="d-flex align-items-center gap-2 mb-2">
                                            <h5 class="mb-0">
                                                <?= SecurityHelper::escape($note['title'] ?? 'بدون عنوان') ?>
                                            </h5>
                                            <span class="badge bg-<?= $severityClass ?>">
                                                <?= $severityLabels[$note['severity']] ?? $note['severity'] ?>
                                            </span>
                                            <span class="badge bg-info">
                                                <?= $noteTypeLabels[$note['note_type']] ?? $note['note_type'] ?>
                                            </span>
                                        </div>
                                        <p class="mb-2">
                                            <?= nl2br(SecurityHelper::escape($note['content'] ?? '')) ?>
                                        </p>
                                        <div class="d-flex align-items-center gap-3 text-muted small">
                                            <span>
                                                <i class="bi bi-calendar"></i> 
                                                <?= SecurityHelper::escape(date('Y/m/d H:i', strtotime($note['created_at'] ?? ''))) ?>
                                            </span>
                                            <?php if (!empty($note['created_by_name'])): ?>
                                                <span>
                                                    <i class="bi bi-person"></i> 
                                                    <?= SecurityHelper::escape($note['created_by_name']) ?>
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
                            <p class="mb-0">هیچ یادداشت پرونده‌ای برای شما ثبت نشده است.</p>
                        </div>
                    <?php endif; ?>
                    
                </div>
            </div>
        </div>
    </div>
</div>
