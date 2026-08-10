<?php
/**
 * Case Notes Form View
 * Create or edit case note
 */
use App\Helpers\SecurityHelper;

$case_note = $case_note ?? null;
?>


<div class="container-fluid">
    <div class="row">
        <div class="col-md-8 offset-md-2">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h2 class="mb-0">
                        <?= $case_note ? 'ویرایش یادداشت پرونده' : 'افزودن یادداشت پرونده جدید' ?>
                    </h2>
                </div>
                <div class="card-body">
                    
                    <form id="caseNoteForm">
                        <input type="hidden" name="_csrf_token" value="<?= $csrf_token ?>">
                        
                        <div class="mb-3">
                            <label for="player_id" class="form-label">بازیکن <span class="text-danger">*</span></label>
                            <select class="form-select" id="player_id" name="player_id" required>
                                <option value="">انتخاب بازیکن</option>
                                <?php foreach ($players as $player): ?>
                                    <option value="<?= $player['id'] ?>"
                                        <?= ($case_note && $case_note['player_id'] == $player['id']) ? 'selected' : '' ?>>
                                        <?= SecurityHelper::escape($player['name']) ?> 
                                        (<?= SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? $player['age_category']) ?>)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <label for="title" class="form-label">عنوان <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="title" name="title" 
                                   value="<?= SecurityHelper::escape($case_note['title'] ?? '') ?>" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="content" class="form-label">محتوا <span class="text-danger">*</span></label>
                            <textarea class="form-control" id="content" name="content" rows="6" required>
<?= SecurityHelper::escape($case_note['content'] ?? '') ?></textarea>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="note_type" class="form-label">نوع یادداشت</label>
                                    <select class="form-select" id="note_type" name="note_type">
                                        <?php foreach ($note_types as $key => $label): ?>
                                            <option value="<?= $key ?>"
                                                <?= ($case_note && $case_note['note_type'] == $key) ? 'selected' : '' ?>>
                                                <?= SecurityHelper::escape($label) ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="severity" class="form-label">اولویت</label>
                                    <select class="form-select" id="severity" name="severity">
                                        <?php foreach ($severities as $key => $label): ?>
                                            <option value="<?= $key ?>"
                                                <?= ($case_note && $case_note['severity'] == $key) ? 'selected' : '' ?>>
                                                <?= SecurityHelper::escape($label) ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3 form-check mt-4">
                                    <input type="checkbox" class="form-check-input" id="is_visible_to_player" name="is_visible_to_player" 
                                           value="1" <?= ($case_note && $case_note['is_visible_to_player']) ? 'checked' : '' ?>>
                                    <label class="form-check-label" for="is_visible_to_player">مشاهده توسط بازیکن</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-check"></i> ذخیره
                            </button>
                            <a href="<?= APP_URL . '/case-notes' ?>" class="btn btn-secondary">
                                <i class="bi bi-arrow-left"></i> انصراف
                            </a>
                        </div>
                    </form>
                    
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('caseNoteForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    var form = e.target;
    var formData = new FormData(form);
    
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> در حال ذخیره...';
    submitBtn.disabled = true;
    
    var url = '<?= $case_note ? APP_URL . "/case-notes/update/" . $case_note['id'] : APP_URL . "/case-notes/store" ?>';
    
    fetch(url, {
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
            alert(data.error || 'خطا در ذخیره یادداشت');
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
