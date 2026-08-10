<?php
/**
 * Homework Review List View
 * Coach can review student homework videos
 */
use App\Helpers\SecurityHelper;

?>


<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h2 class="mb-0">بررسی تمرینات دانش‌آموزان</h2>
                </div>
                <div class="card-body">
                    
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="thead-light">
                                <tr>
                                    <th>بازیکن</th>
                                    <th>عنوان تمرین</th>
                                    <th>کلاس</th>
                                    <th>تاریخ آپلود</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($videos as $video): 
                                    $statusLabel = '';
                                    $statusClass = 'secondary';
                                    
                                    switch ($video['status'] ?? '') {
                                        case 'approved':
                                            $statusLabel = 'تایید شده';
                                            $statusClass = 'success';
                                            break;
                                        case 'reviewed':
                                            $statusLabel = 'بررسی شده';
                                            $statusClass = 'info';
                                            break;
                                        case 'submitted':
                                            $statusLabel = 'ارسال شده';
                                            $statusClass = 'warning';
                                            break;
                                        default:
                                            $statusLabel = 'نامشخص';
                                    }
                                ?>
                                <tr>
                                    <td>
                                        <strong><?= SecurityHelper::escape($video['player_name'] ?? 'نامشخص') ?></strong>
                                        <?php if (!empty($video['user_name'])): ?>
                                            <br><small class="text-muted"><?= SecurityHelper::escape($video['user_name']) ?></small>
                                        <?php endif; ?>
                                    </td>
                                    <td><?= SecurityHelper::escape($video['title'] ?? 'بدون عنوان') ?></td>
                                    <td><?= SecurityHelper::escape($video['classroom_name'] ?? '-') ?></td>
                                    <td><?= SecurityHelper::escape(date('Y/m/d H:i', strtotime($video['created_at'] ?? ''))) ?></td>
                                    <td><span class="badge bg-<?= $statusClass ?>"><?= $statusLabel ?></span></td>
                                    <td>
                                        <a href="<?= APP_URL . '/homework/review/' . $video['id'] ?>" class="btn btn-sm btn-primary">
                                            <i class="bi bi-eye"></i> بررسی
                                        </a>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    
                    <?php if (empty($videos)): ?>
                        <div class="alert alert-info">
                            تمرینی برای بررسی وجود ندارد.
                        </div>
                    <?php endif; ?>
                    
                </div>
            </div>
        </div>
    </div>
</div>
