<?php
/**
 * Documents Pending View
 * Admin can review and approve/reject document submissions
 */
use App\Helpers\SecurityHelper;

$documentTypeLabels = [
    'national_id' => 'کارت ملی',
    'medical_clearance' => 'مجوز پزشکی',
    'insurance' => 'بیمه',
    'birth_certificate' => 'شناسنامه',
    'other' => 'دیگر',
];

$statusLabels = [
    'pending' => 'در انتظار بررسی',
    'approved' => 'تایید شده',
    'rejected' => 'رد شده',
];

?>


<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h2 class="mb-0">اسناد در انتظار تأیید</h2>
                </div>
                <div class="card-body">
                    
                    <?php if (!empty($pending_documents)): ?>
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead class="thead-light">
                                    <tr>
                                        <th>بازیکن</th>
                                        <th>نوع سند</th>
                                        <th>نام فایل</th>
                                        <th>تاریخ آپلود</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($pending_documents as $doc): 
                                        $statusClass = [
                                            'pending' => 'warning',
                                            'approved' => 'success',
                                            'rejected' => 'danger',
                                        ][$doc['status']] ?? 'secondary';
                                    ?>
                                    <tr>
                                        <td>
                                            <strong><?= SecurityHelper::escape($doc['player_name'] ?? $doc['user_name'] ?? 'نامشخص') ?></strong>
                                            <?php if (!empty($doc['user_email'])): ?>
                                                <br><small class="text-muted"><?= SecurityHelper::escape($doc['user_email']) ?></small>
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <span class="badge bg-info">
                                                <?= $documentTypeLabels[$doc['document_type']] ?? $doc['document_type'] ?>
                                            </span>
                                        </td>
                                        <td><?= SecurityHelper::escape($doc['original_filename'] ?? '') ?></td>
                                        <td><?= SecurityHelper::escape(date('Y/m/d H:i', strtotime($doc['created_at'] ?? ''))) ?></td>
                                        <td><span class="badge bg-<?= $statusClass ?>"><?= $statusLabels[$doc['status']] ?? $doc['status'] ?></span></td>
                                        <td>
                                            <?php if ($doc['status'] === 'pending'): ?>
                                                <button class="btn btn-sm btn-success" 
                                                        onclick="approveDocument(<?= $doc['id'] ?>)">
                                                    <i class="bi bi-check"></i> تأیید
                                                </button>
                                                <button class="btn btn-sm btn-danger" 
                                                        onclick="showRejectModal(<?= $doc['id'] ?>, '<?= SecurityHelper::escape($doc['user_name'] ?? '') ?>', '<?= SecurityHelper::escape($doc['original_filename'] ?? '') ?>')">
                                                    <i class="bi bi-x"></i> رد
                                                </button>
                                            <?php else: ?>
                                                <span class="text-muted">-</span>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <div class="alert alert-success text-center">
                            <i class="bi bi-check-circle"></i>
                            <p class="mb-0">هیچ سند در انتظاری برای بررسی وجود ندارد.</p>
                        </div>
                    <?php endif; ?>
                    
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Reject Modal -->
<div class="modal fade" id="rejectModal" tabindex="-1" aria-labelledby="rejectModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <form id="rejectForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="rejectModalLabel">رد سند</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="_csrf_token" value="<?= $csrf_token ?>">
                    <input type="hidden" name="document_id" id="rejectDocumentId">
                    
                    <div class="mb-3">
                        <label for="rejection_reason" class="form-label">دلیل رد <span class="text-danger">*</span></label>
                        <textarea class="form-control" id="rejection_reason" name="rejection_reason" rows="4" required></textarea>
                        <div class="form-text">این دلیل به کاربر نمایش داده خواهد شد.</div>
                    </div>
                    
                    <div id="rejectDocumentInfo" class="alert alert-info"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">انصراف</button>
                    <button type="submit" class="btn btn-danger">رد سند</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
function approveDocument(id) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این سند را تأیید کنید؟')) {
        fetch('/admin/documents/approve/' + id, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRF-Token': '<?= $csrf_token ?>'
            },
            body: '_csrf_token=<?= $csrf_token ?>'
        }).then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.error || 'خطا در تأیید سند');
            }
        });
    }
}

function showRejectModal(id, userName, filename) {
    document.getElementById('rejectDocumentId').value = id;
    document.getElementById('rejection_reason').value = '';
    document.getElementById('rejectDocumentInfo').innerHTML = 
        '<strong>کاربر:</strong> ' + userName + '<br>' +
        '<strong>فایل:</strong> ' + filename;
    
    var modal = new bootstrap.Modal(document.getElementById('rejectModal'));
    modal.show();
}

document.getElementById('rejectForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    var form = e.target;
    var formData = new FormData(form);
    var documentId = document.getElementById('rejectDocumentId').value;
    
    fetch('/admin/documents/reject/' + documentId, {
        method: 'POST',
        body: formData
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            var modal = bootstrap.Modal.getInstance(document.getElementById('rejectModal'));
            modal.hide();
            location.reload();
        } else {
            alert(data.error || 'خطا در رد سند');
        }
    });
});
</script>
