<?php
/**
 * Alerts Index View
 * Admin can create and manage alerts with targeting options
 */
use App\Helpers\SecurityHelper;

?>

<?php include __DIR__ . '/../layouts/main.php'; ?>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h2 class="mb-0">مدیریت اعلانات</h2>
                </div>
                <div class="card-body">
                    
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <h5 class="mb-0">ایجاد اعلان جدید</h5>
                        </div>
                        <div class="card-body">
                            <form method="POST" action="<?= APP_URL . '/admin/alerts/create' ?>">
                                <input type="hidden" name="_csrf_token" value="<?= $csrf_token ?>">
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="title" class="form-label">عنوان اعلان <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="title" name="title" required>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="message" class="form-label">متن اعلان <span class="text-danger">*</span></label>
                                            <textarea class="form-control" id="message" name="message" rows="4" required></textarea>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="priority" class="form-label">اولویت</label>
                                            <select class="form-select" id="priority" name="priority">
                                                <?php foreach ($priorities as $key => $label): ?>
                                                    <option value="<?= $key ?>"><?= SecurityHelper::escape($label) ?></option>
                                                <?php endforeach; ?>
                                            </select>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="expires_at" class="form-label">تاریخ انقضا (اختیاری)</label>
                                            <input type="text" class="form-control" id="expires_at" name="expires_at" 
                                                   placeholder="YYYY/MM/DD HH:MM">
                                        </div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">مخاطبان هدف <span class="text-danger">*</span></label>
                                            <div class="form-check">
                                                <input type="radio" class="form-check-input" id="target_all" 
                                                       name="target_type" value="all" checked>
                                                <label class="form-check-label" for="target_all">همه بازیکنان</label>
                                            </div>
                                            <div class="form-check">
                                                <input type="radio" class="form-check-input" id="target_class" 
                                                       name="target_type" value="class">
                                                <label class="form-check-label" for="target_class">کلاس خاص</label>
                                            </div>
                                            <div class="form-check">
                                                <input type="radio" class="form-check-input" id="target_age_range" 
                                                       name="target_type" value="age_range">
                                                <label class="form-check-label" for="target_age_range">محدوده سنی</label>
                                            </div>
                                            <div class="form-check">
                                                <input type="radio" class="form-check-input" id="target_player" 
                                                       name="target_type" value="player">
                                                <label class="form-check-label" for="target_player">بازیکن خاص</label>
                                            </div>
                                            <div class="form-check">
                                                <input type="radio" class="form-check-input" id="target_position" 
                                                       name="target_type" value="position">
                                                <label class="form-check-label" for="target_position">پست بازی</label>
                                            </div>
                                        </div>
                                        
                                        <div id="target_options" class="mt-3">
                                            <!-- Class selection -->
                                            <div id="class_option" class="mb-3" style="display: none;">
                                                <label for="target_id" class="form-label">انتخاب کلاس</label>
                                                <select class="form-select" id="target_id" name="target_id">
                                                    <option value="">انتخاب کلاس</option>
                                                    <?php foreach ($classrooms as $classroom): ?>
                                                        <option value="<?= $classroom['id'] ?>">
                                                            <?= SecurityHelper::escape($classroom['name']) ?>
                                                        </option>
                                                    <?php endforeach; ?>
                                                </select>
                                            </div>
                                            
                                            <!-- Age range selection -->
                                            <div id="age_range_option" class="row" style="display: none;">
                                                <div class="col-md-6">
                                                    <div class="mb-3">
                                                        <label for="target_age_min" class="form-label">سن حداقل</label>
                                                        <select class="form-select" id="target_age_min" name="target_age_min">
                                                            <?php for ($i = 5; $i <= 25; $i++): ?>
                                                                <option value="<?= $i ?>"><?= $i ?> سال</option>
                                                            <?php endfor; ?>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <div class="mb-3">
                                                        <label for="target_age_max" class="form-label">سن حداکثر</label>
                                                        <select class="form-select" id="target_age_max" name="target_age_max">
                                                            <?php for ($i = 5; $i <= 25; $i++): ?>
                                                                <option value="<?= $i ?>"><?= $i ?> سال</option>
                                                            <?php endfor; ?>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <!-- Player selection -->
                                            <div id="player_option" class="mb-3" style="display: none;">
                                                <label for="target_id_player" class="form-label">انتخاب بازیکن</label>
                                                <select class="form-select" id="target_id_player" name="target_id">
                                                    <option value="">انتخاب بازیکن</option>
                                                    <?php foreach ($players as $player): ?>
                                                        <option value="<?= $player['id'] ?>">
                                                            <?= SecurityHelper::escape($player['name']) ?> 
                                                            (<?= SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? $player['age_category']) ?>)
                                                        </option>
                                                    <?php endforeach; ?>
                                                </select>
                                            </div>
                                            
                                            <!-- Position selection -->
                                            <div id="position_option" class="mb-3" style="display: none;">
                                                <label for="target_position" class="form-label">انتخاب پست</label>
                                                <select class="form-select" id="target_position_select" name="target_audience">
                                                    <option value="">همه پست‌ها</option>
                                                    <?php foreach ($player_positions as $key => $label): ?>
                                                        <option value="<?= $key ?>"><?= SecurityHelper::escape($label) ?></option>
                                                    <?php endforeach; ?>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="d-flex gap-2">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-send"></i> انتشار اعلان
                                    </button>
                                    <button type="reset" class="btn btn-secondary">انصراف</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header bg-light">
                            <h5 class="mb-0">اعلانات منتشر شده</h5>
                        </div>
                        <div class="card-body">
                            <?php if (!empty($alerts)): ?>
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead class="thead-light">
                                            <tr>
                                                <th>عنوان</th>
                                                <th>مخاطب</th>
                                                <th>اولویت</th>
                                                <th>تاریخ انتشار</th>
                                                <th>تاریخ انقضا</th>
                                                <th>ایجاد توسط</th>
                                                <th>عملیات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($alerts as $alert): 
                                                $priorityClass = [
                                                    'low' => 'success',
                                                    'medium' => 'primary',
                                                    'high' => 'warning',
                                                    'urgent' => 'danger',
                                                ][$alert['priority']] ?? 'secondary';
                                            ?>
                                            <tr>
                                                <td><?= SecurityHelper::escape($alert['title'] ?? '') ?></td>
                                                <td>
                                                    <?php
                                                    $targetLabel = 'همه';
                                                    if ($alert['target_type'] === 'class' && !empty($alert['target_id'])) {
                                                        foreach ($classrooms as $c) {
                                                            if ($c['id'] == $alert['target_id']) {
                                                                $targetLabel = 'کلاس: ' . SecurityHelper::escape($c['name']);
                                                                break;
                                                            }
                                                        }
                                                    } elseif ($alert['target_type'] === 'age_range') {
                                                        $targetLabel = 'سنی: ' . ($alert['target_age_min'] ?? '') . '-' . ($alert['target_age_max'] ?? '') . ' سال';
                                                    } elseif ($alert['target_type'] === 'player' && !empty($alert['target_id'])) {
                                                        foreach ($players as $p) {
                                                            if ($p['id'] == $alert['target_id']) {
                                                                $targetLabel = 'بازیکن: ' . SecurityHelper::escape($p['name']);
                                                                break;
                                                            }
                                                        }
                                                    } elseif ($alert['target_type'] === 'position') {
                                                        $targetLabel = 'پست: ' . ($player_positions[$alert['target_audience']] ?? $alert['target_audience']);
                                                    }
                                                    echo SecurityHelper::escape($targetLabel);
                                                    ?>
                                                </td>
                                                <td><span class="badge bg-<?= $priorityClass ?>"><?= SecurityHelper::escape($priorities[$alert['priority']] ?? $alert['priority']) ?></span></td>
                                                <td><?= SecurityHelper::escape(date('Y/m/d H:i', strtotime($alert['created_at'] ?? ''))) ?></td>
                                                <td><?= SecurityHelper::escape($alert['expires_at'] ? date('Y/m/d H:i', strtotime($alert['expires_at'])) : 'بدون تاریخ') ?></td>
                                                <td><?= SecurityHelper::escape($alert['author_name'] ?? '') ?></td>
                                                <td>
                                                    <button class="btn btn-sm btn-outline-danger" 
                                                            onclick="deleteAlert(<?= $alert['id'] ?>)">
                                                        <i class="bi bi-trash"></i> حذف
                                                    </button>
                                                </td>
                                            </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            <?php else: ?>
                                <div class="alert alert-info">
                                    هیچ اعلان منتشر شده‌ای وجود ندارد.
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
// Show/hide target options based on selection
const targetRadios = document.querySelectorAll('input[name="target_type"]');
targetRadios.forEach(radio => {
    radio.addEventListener('change', function() {
        // Hide all options
        document.getElementById('class_option').style.display = 'none';
        document.getElementById('age_range_option').style.display = 'none';
        document.getElementById('player_option').style.display = 'none';
        document.getElementById('position_option').style.display = 'none';
        
        // Show selected option
        const value = this.value;
        if (value === 'class') {
            document.getElementById('class_option').style.display = 'block';
        } else if (value === 'age_range') {
            document.getElementById('age_range_option').style.display = 'block';
        } else if (value === 'player') {
            document.getElementById('player_option').style.display = 'block';
        } else if (value === 'position') {
            document.getElementById('position_option').style.display = 'block';
        }
    });
});

function deleteAlert(id) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این اعلان را حذف کنید؟')) {
        fetch('/admin/alerts/delete/' + id, {
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
                alert(data.error || 'خطا در حذف اعلان');
            }
        });
    }
}
</script>
