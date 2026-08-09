<?php
$csrfToken = $csrf_token ?? '';
?>

<div class="auth-container">
    <div class="auth-box">
        <div style="text-align:center;font-size:3rem;margin-bottom:8px;">🏆</div>
        <h2>ثبت‌نام دانش‌آموز</h2>
        <p class="auth-tagline">برای پیوستن به باشگاه، اطلاعات خود را وارد کنید</p>

        <form method="POST" action="<?= APP_URL ?>/register">
            <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">

            <div class="form-group">
                <label for="name">نام و نام خانوادگی <span class="text-danger">*</span></label>
                <input type="text" id="name" name="name" required>
            </div>

            <div class="form-group">
                <label for="email">📧 ایمیل <span class="text-danger">*</span></label>
                <input type="email" id="email" name="email" required>
            </div>

            <div class="form-group">
                <label for="national_id">شماره ملی <span class="text-danger">*</span></label>
                <input type="text" id="national_id" name="national_id" required>
                <small>کد ملی خود را وارد کنید</small>
            </div>

            <div class="form-group">
                <label for="phone">تلفن همراه</label>
                <input type="tel" id="phone" name="phone">
            </div>

            <div class="form-group">
                <label for="date_of_birth">تاریخ تولد <span class="text-danger">*</span></label>
                <input type="text" id="date_of_birth" name="date_of_birth" placeholder="YYYY/MM/DD" required>
                <small>فرمت: سال/ماه/روز (مثال: 1380/01/01)</small>
            </div>

            <div class="form-group">
                <label for="position">پست بازی <span class="text-danger">*</span></label>
                <select id="position" name="position" class="form-select" required>
                    <option value="">انتخاب پست</option>
                    <?php foreach (PLAYER_POSITIONS as $key => $label): ?>
                        <option value="<?= $key ?>"><?= \App\Helpers\SecurityHelper::escape($label) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group">
                <label for="password">🔒 رمز عبور <span class="text-danger">*</span></label>
                <input type="password" id="password" name="password" required>
                <small>حداقل ۸ کاراکتر — حروف بزرگ، کوچک، عدد و نماد</small>
            </div>

            <div class="form-group">
                <label for="password_confirmation">🔒 تکرار رمز عبور <span class="text-danger">*</span></label>
                <input type="password" id="password_confirmation" name="password_confirmation" required>
            </div>

            <div class="alert alert-info" style="margin: 15px 0;">
                <small>
                    پس از ثبت‌نام، باید اسناد خود (کارت ملی، مجوز پزشکی، شناسنامه) را آپلود کنید.
                    حساب شما پس از تأیید اسناد توسط مدیر فعال خواهد شد.
                </small>
            </div>

            <button type="submit" class="btn btn-primary">ثبت‌نام ⚽</button>
        </form>

        <p class="auth-link">
            حساب داری؟ <a href="<?= APP_URL ?>/login">ورود</a>
        </p>
    </div>
</div>

<script>
// Initialize Persian date picker if available
if (typeof jalaliDatepicker !== 'undefined') {
    jalaliDatepicker.startWatch();
}
</script>
