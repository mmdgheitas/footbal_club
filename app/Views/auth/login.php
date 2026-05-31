<?php
/**
 * Login View
 */
$csrfToken = $csrf_token ?? '';
?>

<div class="auth-container">
    <div class="auth-box">
        <h2>ورود به سیستم</h2>

        <form method="POST" action="<?= APP_URL ?>/login">
            <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

            <div class="form-group">
                <label for="email">آدرس ایمیل</label>
                <input type="email" id="email" name="email" required>
            </div>

            <div class="form-group">
                <label for="password">رمز عبور</label>
                <input type="password" id="password" name="password" required>
            </div>

            <button type="submit" class="btn btn-primary">ورود</button>
        </form>

        <p class="auth-link">
            حساب کاربری ندارید؟ <a href="<?= APP_URL ?>/register">اینجا ثبت‌نام کنید</a>
        </p>
    </div>
</div>

<style>
.auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-box {
    background: white;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    width: 100%;
    max-width: 400px;
}

.auth-box h2 {
    text-align: center;
    margin-bottom: 30px;
    color: #333;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #555;
}

.form-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.form-group input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-primary {
    width: 100%;
    padding: 12px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
}

.btn-primary:hover {
    background: #5568d3;
}

.auth-link {
    text-align: center;
    margin-top: 20px;
    font-size: 14px;
}

.auth-link a {
    color: #667eea;
    text-decoration: none;
}
</style>
