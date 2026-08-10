<?php
/**
 * Document Upload View
 * Student document upload form
 */
use App\Helpers\SecurityHelper;

$requiredTypes = $requiredTypes ?? ['national_id', 'medical_clearance', 'birth_certificate'];
$typeLabels = [
    'national_id' => 'کارت ملی',
    'medical_clearance' => 'مجوز پزشکی',
    'birth_certificate' => 'شناسنامه',
    'insurance' => 'بیمه',
    'other' => 'دیگر',
];

?>


<div class="container-fluid">
    <div class="row">
        <div class="col-md-8 offset-md-2">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h2 class="mb-0">آپلود اسناد</h2>
                </div>
                <div class="card-body">
                    
                    <?php if (!empty($rejection_reason)): ?>
                        <div class="alert alert-danger">
                            <strong>دلیل رد اسناد:</strong> <?= SecurityHelper::escape($rejection_reason) ?>
                            <p class="mt-2">لطفاً اسناد خود را مجدداً آپلود کنید.</p>
                        </div>
                    <?php endif; ?>
                    
                    <?php if ($document_status === 'approved'): ?>
                        <div class="alert alert-success">
                            <strong>تبریک!</strong> اسناد شما تأیید شده است. شما اکنون می‌توانید وارد پنل خود شوید.
                        </div>
                    <?php endif; ?>
                    
                    <p class="lead">
                        لطفاً اسناد مورد نیاز خود را آپلود کنید تا توسط مدیر بررسی و تأیید شوند.
                    </p>
                    
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead class="thead-light">
                                <tr>
                                    <th>نوع سند</th>
                                    <th>وضعیت</th>
                                    <th>نام فایل</th>
                                    <th>تاریخ آپلود</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($requiredTypes as $type): 
                                    $doc = $documents[$type] ?? ['submitted' => false, 'status' => 'not_submitted'];
                                    $statusLabel = '';
                                    $statusClass = 'secondary';
                                    
                                    switch ($doc['status'] ?? 'not_submitted') {
                                        case 'approved':
                                            $statusLabel = 'تایید شده';
                                            $statusClass = 'success';
                                            break;
                                        case 'rejected':
                                            $statusLabel = 'رد شده';
                                            $statusClass = 'danger';
                                            break;
                                        case 'pending':
                                            $statusLabel = 'در انتظار بررسی';
                                            $statusClass = 'warning';
                                            break;
                                        default:
                                            $statusLabel = 'آپلود نشده';
                                            $statusClass = 'secondary';
                                    }
                                    
                                    $isRejected = ($doc['status'] ?? '') === 'rejected';
                                ?>
                                <tr>
                                    <td><strong><?= SecurityHelper::escape($typeLabels[$type] ?? $type) ?></strong></td>
                                    <td><span class="badge bg-<?= $statusClass ?>"><?= $statusLabel ?></span></td>
                                    <td><?= SecurityHelper::escape($doc['filename'] ?? '-') ?></td>
                                    <td><?= SecurityHelper::escape($doc['submitted_at'] ?? '-') ?></td>
                                    <td>
                                        <?php if ($doc['submitted'] && $doc['status'] !== 'approved'): ?>
                                            <button class="btn btn-sm btn-outline-danger" onclick="deleteDocument(<?= $doc['id'] ?? 0 ?>, '<?= $type ?>')">
                                                <i class="bi bi-trash"></i> حذف
                                            </button>
                                        <?php endif; ?>
                                        <?php if (!$doc['submitted'] || $isRejected): ?>
                                            <button class="btn btn-sm btn-primary" onclick="showUploadModal('<?= $type ?>')">
                                                <i class="bi bi-upload"></i> آپلود
                                            </button>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    
                    <?php if ($document_status !== 'approved'): ?>
                        <div class="alert alert-info">
                            <p class="mb-0">پس از آپلود تمام اسناد مورد نیاز، حساب شما توسط مدیر بررسی خواهد شد.</p>
                        </div>
                    <?php endif; ?>
                    
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Upload Modal -->
<div class="modal fade" id="uploadModal" tabindex="-1" aria-labelledby="uploadModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <form id="documentUploadForm" enctype="multipart/form-data">
                <div class="modal-header">
                    <h5 class="modal-title" id="uploadModalLabel">آپلود سند</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="_csrf_token" value="<?= $csrf_token ?>">
                    <input type="hidden" name="document_type" id="documentTypeInput">
                    <input type="hidden" name="user_id" value="<?= $user_id ?>">
                    
                    <div class="mb-3">
                        <label for="documentFile" class="form-label">فایل سند را انتخاب کنید:</label>
                        <input type="file" class="form-control" id="documentFile" name="document" accept=".pdf,.jpg,.jpeg,.png,.gif" required>
                        <div class="form-text">فرمت‌های مجاز: PDF, JPG, PNG, GIF | حداکثر اندازه: 10MB</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">انصراف</button>
                    <button type="submit" class="btn btn-primary">آپلود</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
function showUploadModal(type) {
    document.getElementById('documentTypeInput').value = type;
    document.getElementById('documentFile').value = '';
    var modal = new bootstrap.Modal(document.getElementById('uploadModal'));
    modal.show();
}

function deleteDocument(id, type) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این سند را حذف کنید؟')) {
        fetch('/document/delete/' + id, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRF-Token': '<?= $csrf_token ?>'
            },
            body: '_csrf_token=<?= $csrf_token ?>&type=' + type
        }).then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.error || 'خطا در حذف سند');
            }
        });
    }
}

document.getElementById('documentUploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    var form = e.target;
    var formData = new FormData(form);
    
    fetch('/documents/store', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            var modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
            modal.hide();
            location.reload();
        } else {
            alert(data.error || 'خطا در آپلود سند');
        }
    }).catch(error => {
        alert('خطا در ارتباط با سرور');
    });
});
</script>
