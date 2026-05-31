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
<div class="player-profile">
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
.player-profile { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.profile-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
}
.profile-header h3 { margin: 0 0 4px; font-size: 22px; }
.meta { color: #666; margin: 0; }
.profile-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.info-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
}
.info-card {
    background: #f9f9f9;
    padding: 16px;
    border-radius: 8px;
}
.info-card h4 { margin: 0 0 12px; font-size: 15px; color: #444; }
.info-card dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 0; }
.info-card dt { font-weight: 600; color: #666; }
.info-card dd { margin: 0; }
.muted { color: #999; }
.list-plain { list-style: none; padding: 0; margin: 0; }
.list-plain li { padding: 6px 0; border-bottom: 1px solid #eee; }
.notes-block, .section-block { margin-top: 24px; }
.section-block table { width: 100%; border-collapse: collapse; }
.section-block th, .section-block td { padding: 10px; text-align: right; border-bottom: 1px solid #eee; }
</style>
