<?php
declare(strict_types=1);

/**
 * Application Configuration File
 * PSR-12 compliant - Core settings for Football Club Management System
 */

// Application Information
define('APP_NAME', 'Football Club Manager');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', false); // Set to true only in development
define('APP_ENV', $_ENV['APP_ENV'] ?? 'production');

// Paths
if (!defined('BASE_PATH')) {
    define('BASE_PATH', dirname(__DIR__));
}
if (!defined('APP_PATH')) {
    define('APP_PATH', BASE_PATH . DIRECTORY_SEPARATOR . 'app');
}
if (!defined('PUBLIC_PATH')) {
    define('PUBLIC_PATH', BASE_PATH . DIRECTORY_SEPARATOR . 'public');
}
if (!defined('CONFIG_PATH')) {
    define('CONFIG_PATH', BASE_PATH . DIRECTORY_SEPARATOR . 'config');
}
if (!defined('DATABASE_PATH')) {
    define('DATABASE_PATH', BASE_PATH . DIRECTORY_SEPARATOR . 'database');
}
define('UPLOAD_PATH', PUBLIC_PATH . DIRECTORY_SEPARATOR . 'uploads');
define('PLAYER_UPLOAD_PATH', UPLOAD_PATH . DIRECTORY_SEPARATOR . 'players');
define('DOCS_UPLOAD_PATH', UPLOAD_PATH . DIRECTORY_SEPARATOR . 'docs');

$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
define('BASE_URL', (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
define('APP_URL', BASE_URL . ($scriptDir !== '/' ? $scriptDir : ''));

// Session Configuration
define('SESSION_LIFETIME', (int)($_ENV['SESSION_LIFETIME'] ?? 3600));
$sessionSecure = $_ENV['SESSION_SECURE'] ?? null;
define(
    'SESSION_SECURE',
    $sessionSecure !== null
        ? filter_var($sessionSecure, FILTER_VALIDATE_BOOLEAN)
        : (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
);
define('SESSION_HTTPONLY', filter_var($_ENV['SESSION_HTTPONLY'] ?? 'true', FILTER_VALIDATE_BOOLEAN));
define('SESSION_SAMESITE', $_ENV['SESSION_SAMESITE'] ?? 'Strict');

// File Upload Configuration
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_UPLOAD_EXTENSIONS', ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx']);
define('ALLOWED_MIME_TYPES', [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// Security
define('HASH_ALGORITHM', 'bcrypt');
define('BCRYPT_COST', 12);
define('CSRF_TOKEN_LENGTH', 32);
define('PASSWORD_MIN_LENGTH', 8);

// SMS Configuration (Placeholder for external SMS service)
define('SMS_PROVIDER', $_ENV['SMS_PROVIDER'] ?? 'mock'); // twilio, nexmo, mock
define('SMS_API_KEY', $_ENV['SMS_API_KEY'] ?? '');
define('SMS_API_SECRET', $_ENV['SMS_API_SECRET'] ?? '');
define('SMS_FROM_NUMBER', $_ENV['SMS_FROM_NUMBER'] ?? '');

// Email Configuration
define('MAIL_DRIVER', 'smtp');
define('MAIL_HOST', $_ENV['MAIL_HOST'] ?? 'localhost');
define('MAIL_PORT', $_ENV['MAIL_PORT'] ?? 587);
define('MAIL_USERNAME', $_ENV['MAIL_USERNAME'] ?? '');
define('MAIL_PASSWORD', $_ENV['MAIL_PASSWORD'] ?? '');
define('MAIL_FROM_ADDRESS', $_ENV['MAIL_FROM_ADDRESS'] ?? 'noreply@footballclub.local');
define('MAIL_FROM_NAME', APP_NAME);

// Pagination
define('ITEMS_PER_PAGE', 15);

// Date/Time
date_default_timezone_set('UTC');
define('DATE_FORMAT', 'Y-m-d');
define('DATETIME_FORMAT', 'Y-m-d H:i:s');
define('DISPLAY_DATE_FORMAT', 'd M Y');
define('DISPLAY_DATETIME_FORMAT', 'd M Y, H:i');

// Roles and Permissions
define('ROLES', [
    'super_admin' => 'مدیر ارشد',
    'coach' => 'مربی',
    'accountant' => 'حسابدار',
    'secretary' => 'منشی',
    'player' => 'بازیکن',
]);

// Payment Status
define('PAYMENT_STATUSES', [
    'pending' => 'در انتظار پرداخت',
    'completed' => 'پرداخت شده',
    'failed' => 'ناموفق',
    'refunded' => 'بازپرداخت شده',
]);

// Attendance Status
define('ATTENDANCE_STATUS', [
    'present' => 1,
    'absent' => 2,
    'excused' => 3,
    'late' => 4,
]);

define('ATTENDANCE_STATUS_LABELS', [
    1 => 'حاضر ⚽',
    2 => 'غایب',
    3 => 'موجه',
    4 => 'تأخیر',
]);

// Age Categories
define('AGE_CATEGORIES', [
    'u8' => ['min' => 0, 'max' => 8, 'label' => 'زیر ۸ سال'],
    'u10' => ['min' => 9, 'max' => 10, 'label' => 'زیر ۱۰ سال'],
    'u12' => ['min' => 11, 'max' => 12, 'label' => 'زیر ۱۲ سال'],
    'u14' => ['min' => 13, 'max' => 14, 'label' => 'زیر ۱۴ سال'],
    'u16' => ['min' => 15, 'max' => 16, 'label' => 'زیر ۱۶ سال'],
    'u18' => ['min' => 17, 'max' => 18, 'label' => 'زیر ۱۸ سال'],
    'senior' => ['min' => 19, 'max' => 100, 'label' => 'بزرگسالان'],
]);

// Player Positions
define('PLAYER_POSITIONS', [
    'goalkeeper' => 'دروازه‌بان',
    'defender' => 'مدافع',
    'midfielder' => 'هافبک',
    'forward' => 'مهاجم',
    'striker' => 'مهاجم هدف',
]);

// Attendance Warning Threshold
define('ATTENDANCE_WARNING_THRESHOLD', 75); // 75% attendance required

// Error Reporting
if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('error_log', BASE_PATH . '/storage/logs/error.log');
}



// Return success
return true;
