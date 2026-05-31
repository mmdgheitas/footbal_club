<?php
/**
 * Custom 403 Forbidden page
 */
$title = $title ?? 'دسترسی غیرمجاز';
$message = $message ?? 'شما مجوز دسترسی به این بخش را ندارید.';
$homeUrl = $homeUrl ?? (defined('APP_URL') ? APP_URL . '/dashboard' : '/');
$appName = defined('APP_NAME') ? APP_NAME : 'Football Club Manager';
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 - <?= \App\Helpers\SecurityHelper::escape($title) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #fff;
            padding: 20px;
        }
        .error-card {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            padding: 48px 40px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }
        .error-code {
            font-size: 96px;
            font-weight: 700;
            line-height: 1;
            background: linear-gradient(135deg, #e94560, #ff6b6b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }
        .error-card h1 {
            font-size: 24px;
            margin-bottom: 12px;
            font-weight: 600;
        }
        .error-card p {
            color: rgba(255, 255, 255, 0.75);
            font-size: 15px;
            line-height: 1.7;
            margin-bottom: 32px;
        }
        .error-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .btn-primary {
            background: linear-gradient(135deg, #e94560, #c73650);
            color: #fff;
            box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(233, 69, 96, 0.5);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        .brand {
            margin-top: 28px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.4);
        }
        .icon-lock {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="error-card">
        <svg class="icon-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
        </svg>
        <div class="error-code">403</div>
        <h1><?= \App\Helpers\SecurityHelper::escape($title) ?></h1>
        <p><?= \App\Helpers\SecurityHelper::escape($message) ?></p>
        <div class="error-actions">
            <a href="<?= \App\Helpers\SecurityHelper::escapeAttribute($homeUrl) ?>" class="btn btn-primary">بازگشت به داشبورد</a>
            <a href="javascript:history.back()" class="btn btn-secondary">صفحه قبل</a>
        </div>
        <p class="brand"><?= \App\Helpers\SecurityHelper::escape($appName) ?></p>
    </div>
</body>
</html>
