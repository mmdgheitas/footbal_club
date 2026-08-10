<?php
/**
 * Achievements Index View
 * List achievements for player or admin
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


<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h2 class="mb-0">
                        <?= $is_admin ? 'مدیریت دستاوردها' : 'دستاوردهای من' ?>
                    </h2>
                    <?php if ($is_admin): ?>
                        <a href="<?= APP_URL . '/achievements/create' ?>" class="btn btn-light">
                            <i class="bi bi-plus"></i> افزودن دستاورد
                        </a>
                    <?php endif; ?>
                </div>
                <div class="card-body">
                    
                    <?php if ($is_admin && !empty($players)): ?>
                        <div class="row mb-4">
                            <div class="col-md-4">
                                <form method="get" action="<?= APP_URL . '/achievements' ?>">
                                    <div class="input-group">
                                        <select name="player_id" class="form-select">
                                            <option value="">همه بازیکنان</option>
                                            <?php foreach ($players as $p): ?>
                                                <option value="<?= $p['id'] ?>" 
                                                    <?= ($selected_player && $selected_player['id'] == $p['id']) ? 'selected' : '' ?>>
                                                    <?= SecurityHelper::escape($p['name']) ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                        <button type="submit" class="btn btn-primary">فیلتر</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    <?php endif; ?>
                    
                    <?php if (!empty($stats) && !$is_admin): ?>
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h3 class="text-primary"><?= $stats['total'] ?></h3>
                                        <p class="mb-0">تعداد دستاوردها</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h3 class="text-success"><?= $stats['total_points'] ?></h3>
                                        <p class="mb-0">امتیاز کلی</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endif; ?>
                    
                    <?php if (!empty($achievements)): ?>
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead class="thead-light">
                                    <tr>
                                        <?php if ($is_admin): ?>
                                            <th>بازیکن</th>
                                        <?php endif; ?>
                                        <th>عنوان</th>
                                        <th>نوع</th>
                                        <th>تاریخ</th>
                                        <th>امتیاز</th>
                                        <?php if ($is_admin): ?>
                                            <th>ایجاد توسط</th>
                                            <th>وضعیت</th>
                                            <th>عملیات</th>
                                        <?php endif; ?>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($achievements as $achievement): ?>
                                    <tr>
                                        <?php if ($is_admin): ?>
                                            <td><?= SecurityHelper::escape($achievement['player_name'] ?? '') ?></td>
                                        <?php endif; ?>
                                        <td><?= SecurityHelper::escape($achievement['title'] ?? '') ?></td>
                                        <td>
                                            <span class="badge bg-info">
                                                <?= $achievementTypeLabels[$achievement['achievement_type']] ?? $achievement['achievement_type'] ?>
                                            </span>
                                        </td>
                                        <td><?= SecurityHelper::escape(date('Y/m/d', strtotime($achievement['date_achieved'] ?? $achievement['created_at'] ?? ''))) ?></td>
                                        <td><?= SecurityHelper::escape($achievement['points'] ?? '0') ?></td>
                                        <?php if ($is_admin): ?>
                                            <td><?= SecurityHelper::escape($achievement['created_by_name'] ?? '') ?></td>
                                            <td>
                                                <span class="badge bg-<?= ($achievement['is_published'] ? 'success' : 'secondary') ?>">
                                                    <?= ($achievement['is_published'] ? 'منتشر شده' : 'پیش‌نویس') ?>
                                                </span>
                                            </td>
                                            <td>
                                                <a href="<?= APP_URL . '/achievements/edit/' . $achievement['id'] ?>" 
                                                   class="btn btn-sm btn-outline-primary">
                                                    <i class="bi bi-pencil"></i>
                                                </a>
                                                <button class="btn btn-sm btn-outline-<?= ($achievement['is_published'] ? 'warning' : 'success') ?>"
                                                        onclick="togglePublish(<?= $achievement['id'] ?>, <?= ($achievement['is_published'] ? 'false' : 'true') ?>)">
                                                    <i class="bi bi-<?= ($achievement['is_published'] ? 'eye-slash' : 'eye') ?>"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger" 
                                                        onclick="deleteAchievement(<?= $achievement['id'] ?>)">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        <?php endif; ?>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <div class="alert alert-info">
                            <?= $is_admin ? 'هیچ دستاوردی یافت نشد.' : 'شما هنوز دستاوردی ندارید.' ?>
                        </div>
                    <?php endif; ?>
                    
                </div>
            </div>
        </div>
    </div>
</div>

<?php if ($is_admin): ?>
<script>
function togglePublish(id, publish) {
    if (confirm('آیا مطمئن هستید که می‌خواهید وضعیت انتشار را تغییر دهید؟')) {
        fetch('/achievements/toggle-publish/' + id, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRF-Token': '<?= $csrf_token ?>'
            },
            body: '_csrf_token=<?= $csrf_token ?>&publish=' + (publish ? '1' : '0')
        }).then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.error || 'خطا در تغییر وضعیت');
            }
        });
    }
}

function deleteAchievement(id) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این دستاورد را حذف کنید؟')) {
        fetch('/achievements/delete/' + id, {
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
                alert(data.error || 'خطا در حذف دستاورد');
            }
        });
    }
}
</script>
<?php endif; ?>
