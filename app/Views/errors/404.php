<?php
/**
 * Custom 404 Not Found page
 */
$title = $title ?? 'صفحه پیدا نشد';
$message = $message ?? 'صفحه‌ای که دنبال آن هستید وجود ندارد یا جابه‌جا شده است.';
$homeUrl = $homeUrl ?? (defined('APP_URL') ? APP_URL . '/dashboard' : '/');
$appName = defined('APP_NAME') ? APP_NAME : 'Football Club Manager';
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - <?= \App\Helpers\SecurityHelper::escape($title) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= defined('APP_URL') ? APP_URL . '/assets/css/style.css' : '/assets/css/style.css' ?>">
    <link rel="stylesheet" href="<?= defined('APP_URL') ? APP_URL . '/assets/css/animations.css' : '/assets/css/animations.css' ?>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Vazirmatn', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #2d3436 0%, #636e72 100%);
            color: #fff;
            padding: 20px;
        }
        .error-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 48px 40px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }
        .error-code {
            font-size: 96px;
            font-weight: 700;
            color: #74b9ff;
            line-height: 1;
            margin-bottom: 8px;
        }
        .error-card h1 { font-size: 24px; margin-bottom: 12px; }
        .error-card p {
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.7;
            margin-bottom: 32px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 8px;
            background: #0984e3;
            color: #fff;
            text-decoration: none;
            font-weight: 600;
        }
        .btn:hover { background: #0770c9; }
        .brand { margin-top: 24px; font-size: 13px; opacity: 0.6; }
    </style>
</head>
<body>
    <div class="error-card">
        <div class="error-code">404</div>
        <h1><?= \App\Helpers\SecurityHelper::escape($title) ?></h1>
        <p><?= \App\Helpers\SecurityHelper::escape($message) ?></p>
        <a href="<?= \App\Helpers\SecurityHelper::escapeAttribute($homeUrl) ?>" class="btn">بازگشت به خانه</a>
        <p class="brand"><?= \App\Helpers\SecurityHelper::escape($appName) ?></p>
    </div>
</body>
</html>
