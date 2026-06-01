<?php
/**
 * Player profile view
 */
$player = $player ?? [];
$playerId = (int)($player['id'] ?? 0);
$guardians = $player['guardians'] ?? [];
$medical = $player['medical'] ?? null;
$injuries = $player['injuries'] ?? [];
$files = $player['files'] ?? [];
$canManage = \App\Middleware\RbacMiddleware::hasPermission('manage_players');
$canViewMedical = \App\Middleware\RbacMiddleware::hasPermission('view_medical');
?>
<div class="player-profile panel">
    <div class="profile-header">
        <div>
            <h3><?= \App\Helpers\SecurityHelper::escape($player['name'] ?? '') ?></h3>
            <p class="meta">
                <?= \App\Helpers\SecurityHelper::escape(PLAYER_POSITIONS[$player['position']] ?? $player['position'] ?? '') ?>
                &bull;
                <?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? $player['age_category'] ?? '') ?>
            </p>
        </div>
        <div class="profile-actions">
            <a href="<?= APP_URL ?>/players" class="btn btn-secondary">لیست بازیکنان</a>
            <?php if ($canManage): ?>
                <a href="<?= APP_URL ?>/player/edit/<?= $playerId ?>" class="btn btn-primary">ویرایش</a>
            <?php endif; ?>
            <?php if ($canViewMedical): ?>
                <a href="<?= APP_URL ?>/medical/view/<?= $playerId ?>" class="btn btn-secondary">پرونده پزشکی</a>
            <?php endif; ?>
            <a href="<?= APP_URL ?>/attendance/report/<?= $playerId ?>" class="btn btn-secondary">گزارش حضور</a>
        </div>
    </div>

    <div class="info-cards">
        <div class="info-card">
            <h4>اطلاعات شخصی</h4>
            <dl>
                <dt>کد ملی</dt>
                <dd><?= \App\Helpers\SecurityHelper::escape($player['national_id'] ?? '-') ?></dd>
                <dt>تاریخ تولد</dt>
                <dd><?= \App\Helpers\SecurityHelper::escape($player['date_of_birth'] ?? '-') ?></dd>
                <dt>تلفن</dt>
                <dd><?= \App\Helpers\SecurityHelper::escape($player['phone'] ?? '-') ?></dd>
                <dt>ایمیل</dt>
                <dd><?= \App\Helpers\SecurityHelper::escape($player['email'] ?? '-') ?></dd>
                <dt>وضعیت</dt>
                <dd><?= !empty($player['status']) ? 'فعال' : 'غیرفعال' ?></dd>
                <dt>تأیید پزشکی</dt>
                <dd><?= !empty($player['medical_clearance']) ? 'بله' : 'خیر' ?></dd>
            </dl>
        </div>

        <div class="info-card">
            <h4>سرپرستان</h4>
            <?php if (empty($guardians)): ?>
                <p class="muted">ثبت نشده</p>
            <?php else: ?>
                <ul class="list-plain">
                    <?php foreach ($guardians as $g): ?>
                    <li>
                        <strong><?= \App\Helpers\SecurityHelper::escape($g['name']) ?></strong>
                        — <?= \App\Helpers\SecurityHelper::escape($g['phone']) ?>
                        <?php if (!empty($g['relationship'])): ?>
                            <span class="muted">(<?= \App\Helpers\SecurityHelper::escape($g['relationship']) ?>)</span>
                        <?php endif; ?>
                    </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </div>

        <div class="info-card">
            <h4>خلاصه پزشکی</h4>
            <?php if (empty($medical)): ?>
                <p class="muted">پرونده پزشکی ثبت نشده.
                    <?php if ($canViewMedical): ?>
                        <a href="<?= APP_URL ?>/medical/view/<?= $playerId ?>">ثبت کنید</a>
                    <?php endif; ?>
                </p>
            <?php else: ?>
                <dl>
                    <dt>گروه خونی</dt>
                    <dd><?= \App\Helpers\SecurityHelper::escape($medical['blood_type'] ?? '-') ?></dd>
                    <dt>آلرژی</dt>
                    <dd><?= \App\Helpers\SecurityHelper::escape($medical['allergies'] ?? '-') ?></dd>
                </dl>
            <?php endif; ?>
        </div>
    </div>

    <?php if (!empty($player['notes'])): ?>
    <div class="notes-block">
        <h4>یادداشت</h4>
        <p><?= nl2br(\App\Helpers\SecurityHelper::escape($player['notes'])) ?></p>
    </div>
    <?php endif; ?>

    <?php if (!empty($injuries)): ?>
    <div class="section-block">
        <h4>سوابق مصدومیت</h4>
        <table>
            <thead>
                <tr>
                    <th>نوع</th>
                    <th>شدت</th>
                    <th>تاریخ</th>
                    <th>بهبود</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($injuries as $injury): ?>
                <tr>
                    <td><?= \App\Helpers\SecurityHelper::escape($injury['injury_type']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape($injury['severity']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape($injury['date_of_injury']) ?></td>
                    <td><?= $injury['recovery_date'] ? \App\Helpers\SecurityHelper::escape($injury['recovery_date']) : 'در حال بهبود' ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>

    <?php if (!empty($files)): ?>
    <div class="section-block">
        <h4>فایل‌های پیوست</h4>
        <ul class="list-plain">
            <?php foreach ($files as $file): ?>
            <li>
                <?= \App\Helpers\SecurityHelper::escape($file['file_type'] ?? 'document') ?>
                — <?= \App\Helpers\SecurityHelper::escape($file['original_name'] ?? $file['stored_name'] ?? '') ?>
            </li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>
</div>

<style>
.profile-header h3 { margin: 0 0 4px; font-size: 22px; color: var(--white); }
.meta { color: var(--text-muted); margin: 0; }
.notes-block, .section-block { margin-top: 24px; }
</style>
