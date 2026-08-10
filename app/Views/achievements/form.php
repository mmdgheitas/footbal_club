<?php
/**
 * Achievements Form View
 * Create or edit achievement
 */
use App\Helpers\SecurityHelper;

$achievement = $achievement ?? null;
?>


<div class="container-fluid">
    <div class="row">
        <div class="col-md-8 offset-md-2">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h2 class="mb-0">
                        <?= $achievement ? 'ویرایش دستاورد' : 'افزودن دستاورد جدید' ?>
                    </h2>
                </div>
                <div class="card-body">
                    
                    <form id="achievementForm">
                        <input type="hidden" name="_csrf_token" value="<?= $csrf_token ?>">
                        
                        <div class="mb-3">
                            <label for="player_id" class="form-label">بازیکن <span class="text-danger">*</span></label>
                            <select class="form-select" id="player_id" name="player_id" required>
                                <option value="">انتخاب بازیکن</option>
                                <?php foreach ($players as $player): ?>
                                    <option value="<?= $player['id'] ?>"
                                        <?= ($achievement && $achievement['player_id'] == $player['id']) ? 'selected' : '' ?>>
                                        <?= SecurityHelper::escape($player['name']) ?> 
                                        (<?= SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? $player['age_category']) ?>)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <label for="title" class="form-label">عنوان <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="title" name="title" 
                                   value="<?= SecurityHelper::escape($achievement['title'] ?? '') ?>" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="description" class="form-label">توضیحات</label>
                            <textarea class="form-control" id="description" name="description" rows="4">
<?= SecurityHelper::escape($achievement['description'] ?? '') ?></textarea>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="achievement_type" class="form-label">نوع دستاورد</label>
                                    <select class="form-select" id="achievement_type" name="achievement_type">
                                        <?php foreach ($achievement_types as $key => $label): ?>
                                            <option value="<?= $key ?>"
                                                <?= ($achievement && $achievement['achievement_type'] == $key) ? 'selected' : '' ?>>
                                                <?= SecurityHelper::escape($label) ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="points" class="form-label">امتیاز</label>
                                    <input type="number" class="form-control" id="points" name="points" 
                                           value="<?= SecurityHelper::escape($achievement['points'] ?? '0') ?>" min="0">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="date_achieved" class="form-label">تاریخ دستاورد</label>
                                    <input type="date" class="form-control" id="date_achieved" name="date_achieved" 
                                           value="<?= SecurityHelper::escape($achievement['date_achieved'] ?? date('Y-m-d')) ?>">
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="is_published" name="is_published" 
                                   value="1" <?= ($achievement && $achievement['is_published']) ? 'checked' : 'checked' ?>>
                            <label class="form-check-label" for="is_published">منتشر شود</label>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-check"></i> ذخیره
                            </button>
                            <a href="<?= APP_URL . '/achievements' ?>" class="btn btn-secondary">
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
document.getElementById('achievementForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    var form = e.target;
    var formData = new FormData(form);
    
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> در حال ذخیره...';
    submitBtn.disabled = true;
    
    var url = '<?= $achievement ? APP_URL . "/achievements/update/" . $achievement['id'] : APP_URL . "/achievements/store" ?>';
    
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
            alert(data.error || 'خطا در ذخیره دستاورد');
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
