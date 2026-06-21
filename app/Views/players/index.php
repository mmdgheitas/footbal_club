<?php
$players = $players ?? [];
$classrooms = $classrooms ?? [];
$selectedClassroomId = $selected_classroom_id ?? null;
$pagination = $pagination ?? [];
$search = $search ?? '';
$csrfToken = $csrf_token ?? '';
?>

<div class="players-section panel">
    <div class="section-header">
        <a href="<?= APP_URL ?>/player/create" class="btn btn-primary">⚽ بازیکن جدید</a>
        <form method="GET" class="search-form" style="display:flex;gap:8px;align-items:center;">
            <select name="classroom_id" style="padding: 8px 12px;border: 1px solid var(--border-color);border-radius: var(--radius-sm);background-color: var(--navy-light);color: var(--white);font-family: inherit;">
                <option value="">همه کلاس‌ها</option>
                <?php foreach ($classrooms as $cls): ?>
                    <option value="<?= (int)$cls['id'] ?>" <?= $selectedClassroomId === (int)$cls['id'] ? 'selected' : '' ?>>
                        <?= \App\Helpers\SecurityHelper::escape($cls['name']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <input type="text" name="search" placeholder="🔍 جستجو نام یا کد ملی..." value="<?= \App\Helpers\SecurityHelper::escapeAttribute($search) ?>">
            <button type="submit" class="btn btn-secondary">جستجو</button>
        </form>
    </div>

    <?php if (empty($players)): ?>
        <p class="empty-message">هنوز بازیکنی با این شرایط یافت نشد! <a href="<?= APP_URL ?>/player/create">بازیکن جدید اضافه کن ⚽</a></p>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>نام</th>
                        <th>کلاس</th>
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
                        <td>
                            <span style="color:var(--grass-bright);font-weight:600;">
                                <?= \App\Helpers\SecurityHelper::escape($player['classroom_name'] ?: 'بدون کلاس') ?>
                            </span>
                        </td>
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

        <?php if (!empty($pagination)):
            $queryString = '?search=' . urlencode($search) . '&classroom_id=' . (int)$selectedClassroomId;
        ?>
        <div class="pagination">
            <?php if ($pagination['page'] > 1): ?>
                <a href="<?= $queryString ?>&page=1" class="btn btn-secondary btn-sm">اول</a>
                <a href="<?= $queryString ?>&page=<?= $pagination['page'] - 1 ?>" class="btn btn-secondary btn-sm">قبلی</a>
            <?php endif; ?>
            <span>صفحه <?= $pagination['page'] ?> از <?= $pagination['last_page'] ?></span>
            <?php if ($pagination['page'] < $pagination['last_page']): ?>
                <a href="<?= $queryString ?>&page=<?= $pagination['page'] + 1 ?>" class="btn btn-secondary btn-sm">بعدی</a>
                <a href="<?= $queryString ?>&page=<?= $pagination['last_page'] ?>" class="btn btn-secondary btn-sm">آخر</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    <?php endif; ?>
</div>
