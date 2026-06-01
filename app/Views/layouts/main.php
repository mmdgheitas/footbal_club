<?php
/**
 * Main Layout View
 */
$title = $title ?? 'Football Club Manager';
$pageTitle = $title . ' - ' . APP_NAME;
$currentUser = $user ?? [];
$userRole = $userRole ?? null;
$currentPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
if ($scriptDir !== '/' && $scriptDir !== '' && str_starts_with($currentPath, $scriptDir)) {
    $currentPath = substr($currentPath, strlen($scriptDir)) ?: '/';
}

$assetVer = (string)max(
    @filemtime(PUBLIC_PATH . '/assets/css/style.css') ?: 0,
    @filemtime(PUBLIC_PATH . '/assets/css/animations.css') ?: 0,
    @filemtime(PUBLIC_PATH . '/assets/js/main.js') ?: 0
);

$navItems = [
    '/dashboard' => ['label' => 'داشبورد', 'icon' => '🏠'],
    '/players' => ['label' => 'بازیکنان', 'icon' => '⚽'],
    '/payments' => ['label' => 'مالی', 'icon' => '💰'],
    '/attendance' => ['label' => 'حضور', 'icon' => '📋'],
];

$moreNavItems = [
    '/medical' => ['label' => 'پزشکی', 'icon' => '🏥'],
    '/sms/send' => ['label' => 'پیامک', 'icon' => '📱'],
];

$isActive = static function (string $path) use ($currentPath): bool {
    return $path === '/dashboard'
        ? ($currentPath === '/' || $currentPath === '/dashboard')
        : str_starts_with($currentPath, $path);
};
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#0a1628">
    <meta name="app-url" content="<?= \App\Helpers\SecurityHelper::escapeAttribute(APP_URL) ?>">
    <meta name="csrf-token" content="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrf_token ?? '') ?>">
    <title><?= \App\Helpers\SecurityHelper::escape($pageTitle) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= APP_URL ?>/assets/css/style.css?v=<?= $assetVer ?>">
    <link rel="stylesheet" href="<?= APP_URL ?>/assets/css/animations.css?v=<?= $assetVer ?>">
</head>
<body class="has-bottom-nav">
    <div class="nav-backdrop" id="navBackdrop" aria-hidden="true"></div>

    <div class="wrapper">
        <header class="navbar">
            <div class="navbar-brand">
                <span class="logo-ball" aria-hidden="true">⚽</span>
                <h1><?= APP_NAME ?></h1>
            </div>

            <button type="button" class="nav-toggle" id="navToggle" aria-label="منو" aria-expanded="false">☰</button>

            <nav class="navbar-nav desktop-only" id="mainNav">
                <ul>
                    <?php foreach ($navItems as $path => $item): ?>
                    <li>
                        <a href="<?= APP_URL . $path ?>" class="<?= $isActive($path) ? 'active' : '' ?>">
                            <span aria-hidden="true"><?= $item['icon'] ?></span>
                            <?= \App\Helpers\SecurityHelper::escape($item['label']) ?>
                        </a>
                    </li>
                    <?php endforeach; ?>
                    <?php foreach ($moreNavItems as $path => $item): ?>
                    <li>
                        <a href="<?= APP_URL . $path ?>" class="<?= $isActive($path) ? 'active' : '' ?>">
                            <span aria-hidden="true"><?= $item['icon'] ?></span>
                            <?= \App\Helpers\SecurityHelper::escape($item['label']) ?>
                        </a>
                    </li>
                    <?php endforeach; ?>
                    <?php if ($userRole === 'super_admin'): ?>
                    <li>
                        <a href="<?= APP_URL ?>/admin/users" class="<?= str_starts_with($currentPath, '/admin/users') ? 'active' : '' ?>">
                            <span aria-hidden="true">👥</span> کاربران
                        </a>
                    </li>
                    <li>
                        <a href="<?= APP_URL ?>/admin/settings" class="<?= $currentPath === '/admin/settings' ? 'active' : '' ?>">
                            <span aria-hidden="true">⚙️</span> تنظیمات
                        </a>
                    </li>
                    <?php endif; ?>
                </ul>
            </nav>

            <div class="user-menu">
                <span class="user-badge">👤 <?= \App\Helpers\SecurityHelper::escape($currentUser['name'] ?? 'کاربر') ?></span>
                <a href="<?= APP_URL ?>/logout" class="btn-logout">خروج</a>
            </div>
        </header>

        <main class="container">
            <?php
            $flashes = $flashes ?? [];
            foreach ($flashes as $type => $messages):
                foreach ($messages as $message):
            ?>
            <div class="alert alert-<?= \App\Helpers\SecurityHelper::escape($type) ?>">
                <?= \App\Helpers\SecurityHelper::escape($message) ?>
                <button type="button" class="alert-close">&times;</button>
            </div>
            <?php endforeach; endforeach; ?>

            <div class="page-header">
                <h2><?= \App\Helpers\SecurityHelper::escape($title ?? 'صفحه') ?></h2>
            </div>

            <div class="content">
                <?= $content ?? '' ?>
            </div>
        </main>

        <footer class="footer">
            <p>⚽ &copy; <?= date('Y') ?> <?= APP_NAME ?></p>
        </footer>
    </div>

    <!-- Mobile bottom tab bar -->
    <nav class="bottom-nav" aria-label="منوی اصلی موبایل">
        <?php foreach ($navItems as $path => $item): ?>
        <a href="<?= APP_URL . $path ?>"
           class="bottom-nav-item <?= $isActive($path) ? 'active' : '' ?>">
            <span class="nav-emoji" aria-hidden="true"><?= $item['icon'] ?></span>
            <span><?= \App\Helpers\SecurityHelper::escape($item['label']) ?></span>
        </a>
        <?php endforeach; ?>
        <button type="button" class="bottom-nav-item" id="bottomNavMore" aria-label="بیشتر">
            <span class="nav-emoji" aria-hidden="true">➕</span>
            <span>بیشتر</span>
        </button>
    </nav>

    <div class="mobile-menu" id="mobileMenu" role="menu">
        <?php foreach ($moreNavItems as $path => $item): ?>
        <a href="<?= APP_URL . $path ?>" role="menuitem">
            <span><?= $item['icon'] ?></span>
            <?= \App\Helpers\SecurityHelper::escape($item['label']) ?>
        </a>
        <?php endforeach; ?>
        <?php if ($userRole === 'super_admin'): ?>
        <a href="<?= APP_URL ?>/admin/users" role="menuitem"><span>👥</span> کاربران</a>
        <a href="<?= APP_URL ?>/admin/settings" role="menuitem"><span>⚙️</span> تنظیمات</a>
        <?php endif; ?>
        <a href="<?= APP_URL ?>/player/create" role="menuitem"><span>⚽</span> بازیکن جدید</a>
    </div>

    <script src="<?= APP_URL ?>/assets/js/main.js?v=<?= $assetVer ?>"></script>
</body>
</html>
