<?php
/**
 * Homework Upload View
 * Student homework video upload form
 */
use App\Helpers\SecurityHelper;

?>


<div class="container-fluid">
    <div class="row">
        <div class="col-md-10 offset-md-1">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h2 class="mb-0">آپلود تمرین</h2>
                </div>
                <div class="card-body">
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h4>اطلاعات بازیکن</h4>
                            <?php if ($player): ?>
                                <ul class="list-group mb-4">
                                    <li class="list-group-item"><strong>نام:</strong> <?= SecurityHelper::escape($player['name'] ?? '') ?></li>
                                    <li class="list-group-item"><strong>پست:</strong> <?= SecurityHelper::escape(PLAYER_POSITIONS[$player['position']] ?? $player['position']) ?></li>
                                    <li class="list-group-item"><strong>دسته سنی:</strong> <?= SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? $player['age_category']) ?></li>
                                </ul>
                            <?php endif; ?>
                            
                            <div class="card">
                                <div class="card-header bg-light">
                                    <h5 class="mb-0">آپلود ویدئوی جدید</h5>
                                </div>
                                <div class="card-body">
                                    <form id="homeworkForm" enctype="multipart/form-data">
                                        <input type="hidden" name="_csrf_token" value="<?= $csrf_token ?>">
                                        
                                        <div class="mb-3">
                                            <label for="title" class="form-label">عنوان تمرین <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="title" name="title" required>
                                        </div>
                                        
                                        <?php if (!empty($classrooms)): ?>
                                            <div class="mb-3">
                                                <label for="classroom_id" class="form-label">کلاس</label>
                                                <select class="form-select" id="classroom_id" name="classroom_id">
                                                    <option value="">انتخاب کلاس</option>
                                                    <?php foreach ($classrooms as $classroom): ?>
                                                        <option value="<?= $classroom['id'] ?>">
                                                            <?= SecurityHelper::escape($classroom['name'] ?? '') ?>
                                                        </option>
                                                    <?php endforeach; ?>
                                                </select>
                                            </div>
                                        <?php endif; ?>
                                        
                                        <div class="mb-3">
                                            <label for="description" class="form-label">توضیحات</label>
                                            <textarea class="form-control" id="description" name="description" rows="3"></textarea>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="video" class="form-label">ویدئوی تمرین <span class="text-danger">*</span></label>
                                            <input type="file" class="form-control" id="video" name="video" accept="video/*" required>
                                            <div class="form-text">فرمت‌های مجاز: MP4, WebM, MOV, AVI | حداکثر اندازه: 50MB</div>
                                        </div>
                                        
                                        <button type="submit" class="btn btn-primary">
                                            <i class="bi bi-upload"></i> آپلود
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <h4>تمرینات قبلی</h4>
                            
                            <?php if (!empty($videos)): ?>
                                <div class="table-responsive">
                                    <table class="table table-bordered">
                                        <thead class="thead-light">
                                            <tr>
                                                <th>عنوان</th>
                                                <th>تاریخ</th>
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
                                                <td><?= SecurityHelper::escape($video['title'] ?? 'بدون عنوان') ?></td>
                                                <td><?= SecurityHelper::escape(date('Y/m/d', strtotime($video['created_at'] ?? ''))) ?></td>
                                                <td><span class="badge bg-<?= $statusClass ?>"><?= $statusLabel ?></span></td>
                                                <td>
                                                    <a href="<?= APP_URL . '/homework/view/' . $video['id'] ?>" class="btn btn-sm btn-outline-primary">
                                                        <i class="bi bi-eye"></i> مشاهده
                                                    </a>
                                                </td>
                                            </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            <?php else: ?>
                                <div class="alert alert-info">
                                    شما هنوز تمرینی آپلود نکرده‌اید.
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('homeworkForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    var form = e.target;
    var formData = new FormData(form);
    
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> در حال آپلود...';
    submitBtn.disabled = true;
    
    fetch('/homework/store', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.redirect) {
                window.location.href = data.redirect;
            } else {
                location.reload();
            }
        } else {
            alert(data.error || 'خطا در آپلود ویدئو');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }).catch(error => {
        alert('خطا در ارتباط با سرور');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
});
</script>
