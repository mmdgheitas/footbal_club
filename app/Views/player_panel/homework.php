<?php
/**
 * Player Panel - Homework View
 */
use App\Helpers\SecurityHelper;

?>

<?php include __DIR__ . '/../layouts/main.php'; ?>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h2 class="mb-0">تمرینات من</h2>
                    <a href="<?= APP_URL . '/homework/upload' ?>" class="btn btn-light">
                        <i class="bi bi-plus"></i> آپلود تمرین جدید
                    </a>
                </div>
                <div class="card-body">
                    
                    <?php if (!empty($videos)): ?>
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead class="thead-light">
                                    <tr>
                                        <th>عنوان</th>
                                        <th>تاریخ آپلود</th>
                                        <th>وضعیت</th>
                                        <th>بازخورد مربی</th>
                                        <th>امتیاز</th>
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
                                        }
                                        
                                        $rating = $video['coach_rating'] ?? null;
                                        $ratingLabel = '';
                                        if ($rating !== null) {
                                            $ratingLabels = [1 => 'ضعیف', 2 => 'قابل قبول', 3 => 'خوب', 4 => 'عالی', 5 => 'ممتاز'];
                                            $ratingLabel = $ratingLabels[$rating] ?? $rating . '/5';
                                        }
                                    ?>
                                    <tr>
                                        <td><strong><?= SecurityHelper::escape($video['title'] ?? 'بدون عنوان') ?></strong></td>
                                        <td><?= SecurityHelper::escape(date('Y/m/d H:i', strtotime($video['created_at'] ?? ''))) ?></td>
                                        <td><span class="badge bg-<?= $statusClass ?>"><?= $statusLabel ?></span></td>
                                        <td><?= SecurityHelper::escape($video['coach_feedback'] ?? '-') ?></td>
                                        <td>
                                            <?php if ($rating !== null): ?>
                                                <span class="badge bg-primary"><?= SecurityHelper::escape($ratingLabel) ?></span>
                                            <?php else: ?>
                                                -<?php endif; ?>
                                        </td>
                                        <td>
                                            <a href="#" class="btn btn-sm btn-outline-primary" onclick="viewVideo(<?= $video['id'] ?>)">
                                                <i class="bi bi-play-circle"></i> مشاهده
                                            </a>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <div class="alert alert-info text-center">
                            <i class="bi bi-info-circle"></i>
                            <p class="mb-0">شما هنوز تمرینی آپلود نکرده‌اید.</p>
                            <p>از طریق دکمه "آپلود تمرین جدید" می‌توانید تمرینات خود را ارسال کنید.</p>
                        </div>
                    <?php endif; ?>
                    
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Video Modal -->
<div class="modal fade" id="videoModal" tabindex="-1" aria-labelledby="videoModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="videoModalLabel">مشاهده ویدئو</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <video id="videoPlayer" controls class="w-100" style="max-height: 400px;">
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    </div>
</div>

<script>
function viewVideo(id) {
    fetch('/homework/view/' + id, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(response => response.json())
    .then(data => {
        if (data.video) {
            var videoPlayer = document.getElementById('videoPlayer');
            videoPlayer.innerHTML = '';
            var source = document.createElement('source');
            source.src = '<?= APP_URL ?>/uploads/homework/' + data.video.stored_filename;
            source.type = data.video.mime_type || 'video/mp4';
            videoPlayer.appendChild(source);
            
            var modal = new bootstrap.Modal(document.getElementById('videoModal'));
            modal.show();
        }
    });
}
</script>
