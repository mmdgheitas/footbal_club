<?php
$players = $players ?? [];
$pagination = $pagination ?? [];
$search = $search ?? '';
$csrfToken = $csrf_token ?? '';
?>

<div class="players-section panel">
    <div class="section-header">
        <a href="<?= APP_URL ?>/player/create" class="btn btn-primary">⚽ بازیکن جدید</a>
        <form method="GET" class="search-form">
            <input type="text" name="search" placeholder="🔍 جستجو نام یا کد ملی..." value="<?= \App\Helpers\SecurityHelper::escapeAttribute($search) ?>">
            <button type="submit" class="btn btn-secondary">جستجو</button>
        </form>
    </div>

    <?php if (empty($players)): ?>
        <p class="empty-message">هنوز بازیکنی نیست! <a href="<?= APP_URL ?>/player/create">اولین بازیکن رو اضافه کن ⚽</a></p>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>نام</th>
                        <th>پست</th>
                        <th>رده</th>
                        <th>کد ملی</th>
                        <th>وضعیت</th>
                        <th>پزشکی</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($players as $player): ?>
                    <tr>
                        <td><strong><?= \App\Helpers\SecurityHelper::escape($player['name']) ?></strong></td>
                        <td><?= \App\Helpers\SecurityHelper::escape(PLAYER_POSITIONS[$player['position']] ?? $player['position']) ?></td>
                        <td><?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? '') ?></td>
                        <td><code><?= \App\Helpers\SecurityHelper::escape($player['national_id']) ?></code></td>
                        <td>
                            <span class="status-pill <?= $player['status'] ? 'status-present' : 'status-absent' ?>">
                                <?= $player['status'] ? 'فعال' : 'غیرفعال' ?>
                            </span>
                        </td>
                        <td><?= $player['medical_clearance'] ? '✅' : '❌' ?></td>
                        <td>
                            <a href="<?= APP_URL ?>/player/view/<?= $player['id'] ?>" class="btn btn-secondary btn-sm">مشاهده</a>
                            <a href="<?= APP_URL ?>/player/edit/<?= $player['id'] ?>" class="btn btn-secondary btn-sm">ویرایش</a>
                            <form method="POST" action="<?= APP_URL ?>/player/delete/<?= $player['id'] ?>" style="display:inline;" data-confirm="مطمئنی؟">
                                <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">
                                <button type="submit" class="btn btn-danger btn-sm">حذف</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <?php if (!empty($pagination)): ?>
        <div class="pagination">
            <?php if ($pagination['page'] > 1): ?>
                <a href="?page=1" class="btn btn-secondary btn-sm">اول</a>
                <a href="?page=<?= $pagination['page'] - 1 ?>" class="btn btn-secondary btn-sm">قبلی</a>
            <?php endif; ?>
            <span>صفحه <?= $pagination['page'] ?> از <?= $pagination['last_page'] ?></span>
            <?php if ($pagination['page'] < $pagination['last_page']): ?>
                <a href="?page=<?= $pagination['page'] + 1 ?>" class="btn btn-secondary btn-sm">بعدی</a>
                <a href="?page=<?= $pagination['last_page'] ?>" class="btn btn-secondary btn-sm">آخر</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    <?php endif; ?>
</div>
