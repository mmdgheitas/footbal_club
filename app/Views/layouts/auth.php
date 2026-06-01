<?php
$pageTitle = ($title ?? 'ورود') . ' - ' . APP_NAME;
$assetVer = (string)max(
    @filemtime(PUBLIC_PATH . '/assets/css/style.css') ?: 0,
    @filemtime(PUBLIC_PATH . '/assets/css/animations.css') ?: 0,
    @filemtime(PUBLIC_PATH . '/assets/js/main.js') ?: 0
);
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
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= APP_URL ?>/assets/css/style.css?v=<?= $assetVer ?>">
    <link rel="stylesheet" href="<?= APP_URL ?>/assets/css/animations.css?v=<?= $assetVer ?>">
</head>
<body class="auth-layout">
    <?php
    $flashes = $flashes ?? [];
    foreach ($flashes as $type => $messages):
        foreach ($messages as $message):
    ?>
    <div class="alert alert-<?= \App\Helpers\SecurityHelper::escape($type) ?>" style="position:fixed;top:max(16px, env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:9999;min-width:280px;max-width:92%;animation:slideInAlert 0.4s ease;">
        <?= \App\Helpers\SecurityHelper::escape($message) ?>
        <button class="alert-close" type="button">&times;</button>
    </div>
    <?php endforeach; endforeach; ?>

    <?= $content ?? '' ?>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        document.body.classList.add('is-loaded');
    });
    </script>
    <script src="<?= APP_URL ?>/assets/js/main.js?v=<?= $assetVer ?>"></script>
</body>
</html>
