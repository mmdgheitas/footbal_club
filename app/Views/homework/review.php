<?php
/**
 * Homework Review View
 * Coach reviews a student homework video
 */
use App\Helpers\SecurityHelper;

?>


<div class="container-fluid">
    <div class="row">
        <div class="col-md-8 offset-md-2">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h2 class="mb-0">بررسی تمرین: <?= SecurityHelper::escape($video['title'] ?? 'بدون عنوان') ?></h2>
                </div>
                <div class="card-body">
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h4>اطلاعات تمرین</h4>
                            <ul class="list-group mb-4">
                                <li class="list-group-item"><strong>بازیکن:</strong> <?= SecurityHelper::escape($video['player_name'] ?? '') ?></li>
                                <li class="list-group-item"><strong>کلاس:</strong> <?= SecurityHelper::escape($video['classroom_name'] ?? '-') ?></li>
                                <li class="list-group-item"><strong>تاریخ آپلود:</strong> <?= SecurityHelper::escape(date('Y/m/d H:i', strtotime($video['created_at'] ?? ''))) ?></li>
                                <li class="list-group-item"><strong>اندازه فایل:</strong> <?= formatBytes($video['file_size'] ?? 0) ?></li>
                                <?php if (!empty($video['duration_seconds'])): ?>
                                    <li class="list-group-item"><strong>مدت:</strong> <?= formatDuration($video['duration_seconds']) ?></li>
                                <?php endif; ?>
                            </ul>
                            
                            <div class="card">
                                <div class="card-header bg-light">
                                    <h5 class="mb-0">توضیحات دانش‌آموز</h5>
                                </div>
                                <div class="card-body">
                                    <p><?= nl2br(SecurityHelper::escape($video['description'] ?? 'توضیحی ارائه نشده است')) ?></p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <h4>ویدئو</h4>
                            <div class="card mb-4">
                                <div class="card-body">
                                    <video controls class="w-100" style="max-height: 300px;">
                                        <source src="<?= APP_URL . '/uploads/homework/' . SecurityHelper::escape($video['stored_filename'] ?? '') ?>" 
                                                type="<?= SecurityHelper::escape($video['mime_type'] ?? 'video/mp4') ?>">
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            </div>
                            
                            <div class="card">
                                <div class="card-header bg-light">
                                    <h5 class="mb-0">بررسی و امتیازدهی</h5>
                                </div>
                                <div class="card-body">
                                    <form id="reviewForm">
                                        <input type="hidden" name="_csrf_token" value="<?= $csrf_token ?>">
                                        
                                        <div class="mb-3">
                                            <label for="feedback" class="form-label">بازخورد <span class="text-danger">*</span></label>
                                            <textarea class="form-control" id="feedback" name="feedback" rows="4" required></textarea>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="rating" class="form-label">امتیاز (1-5)</label>
                                            <select class="form-select" id="rating" name="rating">
                                                <option value="">انتخاب امتیاز</option>
                                                <option value="1">1 - ضعیف</option>
                                                <option value="2">2 - قابل قبول</option>
                                                <option value="3">3 - خوب</option>
                                                <option value="4">4 - عالی</option>
                                                <option value="5">5 - ممتاز</option>
                                            </select>
                                            <div class="form-text">اختیاری - اگر امتیاز دهید، وضعیت به "تایید شده" تغییر می‌کند</div>
                                        </div>
                                        
                                        <div class="d-flex gap-2">
                                            <button type="submit" class="btn btn-primary">
                                                <i class="bi bi-check"></i> ثبت بررسی
                                            </button>
                                            <a href="<?= APP_URL . '/homework/review-list' ?>" class="btn btn-secondary">
                                                <i class="bi bi-arrow-left"></i> برگشت
                                            </a>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    </div>
</div>

<?php
function formatBytes(int $bytes): string {
    if ($bytes === 0) {
        return '0 B';
    }
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;
    while ($bytes >= 1024 && $i < count($units) - 1) {
        $bytes /= 1024;
        $i++;
    }
    return round($bytes, 2) . ' ' . $units[$i];
}

function formatDuration(int $seconds): string {
    if ($seconds < 60) {
        return $seconds . ' ثانیه';
    }
    $minutes = (int)($seconds / 60);
    $remainingSeconds = $seconds % 60;
    if ($minutes < 60) {
        return $minutes . ' دقیقه ' . ($remainingSeconds > 0 ? $remainingSeconds . ' ثانیه' : '');
    }
    $hours = (int)($minutes / 60);
    $remainingMinutes = $minutes % 60;
    return $hours . ' ساعت ' . ($remainingMinutes > 0 ? $remainingMinutes . ' دقیقه' : '');
}
?>

<script>
document.getElementById('reviewForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    var form = e.target;
    var formData = new FormData(form);
    
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> در حال ثبت...';
    submitBtn.disabled = true;
    
    fetch('/homework/submit-review/<?= $video['id'] ?>', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.redirect) {
                window.location.href = data.redirect;
            } else {
                window.location.reload();
            }
        } else {
            alert(data.error || 'خطا در ثبت بررسی');
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
