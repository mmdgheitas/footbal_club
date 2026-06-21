<?php
$classrooms = $classrooms ?? [];
$csrfToken = $csrf_token ?? '';
?>

<div class="classrooms-section panel">
    <div class="section-header">
        <a href="<?= APP_URL ?>/classroom/create" class="btn btn-primary">➕ کلاس جدید</a>
        <div style="color:var(--text-muted);font-size:0.9rem;">
            مدیریت کلاس‌ها و تیم‌های ورزشی باشگاه
        </div>
    </div>

    <?php if (empty($classrooms)): ?>
        <p class="empty-message">هنوز هیچ کلاسی تعریف نشده است! <a href="<?= APP_URL ?>/classroom/create">اولین کلاس را ایجاد کنید.</a></p>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>نام کلاس</th>
                        <th>توضیحات</th>
                        <th>تعداد بازیکنان</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($classrooms as $classroom): ?>
                    <tr>
                        <td><strong><?= \App\Helpers\SecurityHelper::escape($classroom['name']) ?></strong></td>
                        <td><?= \App\Helpers\SecurityHelper::escape($classroom['description'] ?: 'بدون توضیح') ?></td>
                        <td>
                            <span class="status-pill status-present">
                                <?= (int)$classroom['player_count'] ?> بازیکن
                            </span>
                        </td>
                        <td>
                            <a href="<?= APP_URL ?>/classroom/view/<?= $classroom['id'] ?>" class="btn btn-secondary btn-sm">مدیریت لیست</a>
                            <a href="<?= APP_URL ?>/classroom/edit/<?= $classroom['id'] ?>" class="btn btn-secondary btn-sm">ویرایش</a>
                            <form method="POST" action="<?= APP_URL ?>/classroom/delete/<?= $classroom['id'] ?>" style="display:inline;" data-confirm="آیا از حذف این کلاس مطمئن هستید؟ بازیکنان کلاس حذف نخواهند شد.">
                                <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">
                                <button type="submit" class="btn btn-danger btn-sm">حذف</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
