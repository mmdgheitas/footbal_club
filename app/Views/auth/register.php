<?php
$csrfToken = $csrf_token ?? '';
?>

<div class="auth-container">
    <div class="auth-box">
        <div style="text-align:center;font-size:3rem;margin-bottom:8px;">🏆</div>
        <h2>عضویت در باشگاه</h2>
        <p class="auth-tagline">به تیم مدیریت ما بپیوند</p>

        <form method="POST" action="<?= APP_URL ?>/register">
            <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

            <div class="form-group">
                <label for="name"> نام کامل</label>
                <input type="text" id="name" name="name" required>
            </div>

            <div class="form-group">
                <label for="email">📧 ایمیل</label>
                <input type="email" id="email" name="email" required>
            </div>

            <div class="form-group">
                <label for="password">🔒 رمز عبور</label>
                <input type="password" id="password" name="password" required>
                <small>حداقل ۸ کاراکتر — حروف بزرگ، کوچک، عدد و نماد</small>
            </div>

            <div class="form-group">
                <label for="password_confirmation">🔒 تکرار رمز</label>
                <input type="password" id="password_confirmation" name="password_confirmation" required>
            </div>

            <button type="submit" class="btn btn-primary">ثبت‌نام ⚽</button>
        </form>

        <p class="auth-link">
            حساب داری؟ <a href="<?= APP_URL ?>/login">ورود</a>
        </p>
    </div>
</div>
