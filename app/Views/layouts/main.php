<?php
/**
 * Main Layout View
 * Wraps all views with header, navigation, and footer
 */
$title = $title ?? 'Football Club Manager';
$pageTitle = $title . ' - ' . APP_NAME;
$currentUser = $user ?? [];
$userRole = $userRole ?? null;
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="app-url" content="<?= \App\Helpers\SecurityHelper::escapeAttribute(APP_URL) ?>">
    <title><?= \App\Helpers\SecurityHelper::escape($pageTitle) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= APP_URL ?>/assets/css/style.css">
</head>
<body>
    <div class="wrapper">
        <!-- Navigation Header -->
        <header class="navbar">
            <div class="navbar-brand">
                <h1><?= APP_NAME ?></h1>
            </div>
            <nav class="navbar-nav">
                <ul>
                    <li><a href="<?= APP_URL ?>/dashboard">داشبورد</a></li>
                    <li><a href="<?= APP_URL ?>/players">بازیکنان</a></li>
                    <li><a href="<?= APP_URL ?>/payments">امور مالی</a></li>
                    <li><a href="<?= APP_URL ?>/attendance">حضور و غیاب</a></li>
                    <li><a href="<?= APP_URL ?>/medical">پرونده پزشکی</a></li>
                    <li><a href="<?= APP_URL ?>/sms/send">ارسال پیامک</a></li>
                    <?php if ($userRole === 'super_admin'): ?>
                    <li><a href="<?= APP_URL ?>/admin/users">کاربران</a></li>
                    <li><a href="<?= APP_URL ?>/admin/settings">تنظیمات</a></li>
                    <?php endif; ?>
                </ul>
            </nav>
            <div class="user-menu">
                <span><?= \App\Helpers\SecurityHelper::escape($currentUser['name'] ?? 'کاربر') ?></span>
                <a href="<?= APP_URL ?>/logout" class="btn-logout">خروج</a>
            </div>
        </header>

        <!-- Main Content -->
        <main class="container">
            <!-- Alerts -->
            <?php
            $flashes = $flashes ?? [];
            foreach ($flashes as $type => $messages):
                foreach ($messages as $message):
            ?>
            <div class="alert alert-<?= \App\Helpers\SecurityHelper::escape($type) ?>">
                <?= \App\Helpers\SecurityHelper::escape($message) ?>
                <button class="alert-close" onclick="this.parentElement.style.display='none';">&times;</button>
            </div>
            <?php endforeach; endforeach; ?>

            <!-- Page Title -->
            <div class="page-header">
                <h2><?= \App\Helpers\SecurityHelper::escape($title ?? 'Page') ?></h2>
            </div>

            <!-- Main Content Area -->
            <div class="content">
                <?= $content ?? '' ?>
            </div>
        </main>

        <!-- Footer -->
        <footer class="footer">
            <p>&copy; <?= date('Y') ?> <?= APP_NAME ?>. تمامی حقوق محفوظ است.</p>
        </footer>
    </div>

    <script src="<?= APP_URL ?>/assets/js/main.js"></script>
</body>
</html>
