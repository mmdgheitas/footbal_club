<?php
/**
 * Player Panel - Achievements View
 */
use App\Helpers\SecurityHelper;

$achievementTypeLabels = [
    'skill' => 'مهارت',
    'attendance' => 'حضور',
    'sportsmanship' => 'روحیه ورزشی',
    'improvement' => 'پیشرفت',
    'teamwork' => 'کاری تیمی',
    'leadership' => 'رهبری',
    'other' => 'دیگر',
];

?>

<?php include __DIR__ . '/../layouts/main.php'; ?>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h2 class="mb-0">دستاوردهای من</h2>
                </div>
                <div class="card-body">
                    
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card text-center h-100">
                                <div class="card-body">
                                    <h3 class="text-primary"><?= $stats['total'] ?? 0 ?></h3>
                                    <p class="mb-0">تعداد دستاوردها</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center h-100">
                                <div class="card-body">
                                    <h3 class="text-success"><?= $stats['total_points'] ?? 0 ?></h3>
                                    <p class="mb-0">امتیاز کلی</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center h-100">
                                <div class="card-body">
                                    <h3 class="text-info"><?= count($stats['by_type'] ?? []) ?></h3>
                                    <p class="mb-0">دسته‌بندی‌ها</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <?php if (!empty($achievements)): ?>
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead class="thead-light">
                                    <tr>
                                        <th>عنوان</th>
                                        <th>نوع</th>
                                        <th>تاریخ</th>
                                        <th>امتیاز</th>
                                        <th>توضیحات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($achievements as $achievement): ?>
                                    <tr>
                                        <td><strong><?= SecurityHelper::escape($achievement['title'] ?? '') ?></strong></td>
                                        <td>
                                            <span class="badge bg-info">
                                                <?= $achievementTypeLabels[$achievement['achievement_type']] ?? $achievement['achievement_type'] ?>
                                            </span>
                                        </td>
                                        <td><?= SecurityHelper::escape(date('Y/m/d', strtotime($achievement['date_achieved'] ?? $achievement['created_at'] ?? ''))) ?></td>
                                        <td><span class="badge bg-success"><?= SecurityHelper::escape($achievement['points'] ?? '0') ?></span></td>
                                        <td><?= SecurityHelper::escape($achievement['description'] ?? '-') ?></td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <div class="alert alert-info text-center">
                            <i class="bi bi-info-circle"></i>
                            <p class="mb-0">شما هنوز دستاوردی دریافت نکرده‌اید. به زودی دستاوردهای شما توسط مربیان ثبت خواهد شد.</p>
                        </div>
                    <?php endif; ?>
                    
                </div>
            </div>
        </div>
    </div>
</div>
