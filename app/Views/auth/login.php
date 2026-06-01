<?php
$csrfToken = $csrf_token ?? '';
?>

<div class="auth-container">
    <div class="auth-box">
        <div style="text-align:center;font-size:3rem;margin-bottom:8px;">⚽</div>
        <h2>ورود به باشگاه</h2>
        <p class="auth-tagline">مدیریت تیم — سریع، ساده، حرفه‌ای</p>

        <form method="POST" action="<?= APP_URL ?>/login">
            <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

            <div class="form-group">
                <label for="email">📧 ایمیل</label>
                <input type="email" id="email" name="email" placeholder="name@example.com" required autofocus>
            </div>

            <div class="form-group">
                <label for="password">🔒 رمز عبور</label>
                <input type="password" id="password" name="password" placeholder="••••••••" required>
            </div>

            <button type="submit" class="btn btn-primary">ورود به سیستم 🚀</button>
        </form>

        <p class="auth-link">
            حساب نداری؟ <a href="<?= APP_URL ?>/register">همین الان ثبت‌نام کن</a>
        </p>
    </div>
</div>
