<?php

declare(strict_types=1);

/**
 * Football Club Management System - Entry Point
 * Public index.php - All requests are routed through here
 */

// Define base paths
define('BASE_PATH', dirname(__DIR__));
define('APP_PATH', BASE_PATH . DIRECTORY_SEPARATOR . 'app');
define('PUBLIC_PATH', __DIR__);
define('CONFIG_PATH', BASE_PATH . DIRECTORY_SEPARATOR . 'config');
define('DATABASE_PATH', BASE_PATH . DIRECTORY_SEPARATOR . 'database');

// Load .env into $_ENV
$envFile = BASE_PATH . DIRECTORY_SEPARATOR . '.env';
if (is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value, " \t\n\r\0\x0B\"'");
    }
}

// Load configuration
require_once CONFIG_PATH . DIRECTORY_SEPARATOR . 'config.php';

// DEBUG: Check APP_DEBUG value immediately
if (isset($_ENV['APP_DEBUG'])) {
    error_log("APP_DEBUG from env: " . $_ENV['APP_DEBUG']);
}
if (defined('APP_DEBUG')) {
    error_log("APP_DEBUG defined as: " . (APP_DEBUG ? 'true' : 'false'));
}

// DEBUG: Immediate output for debugging
if (filter_var($_ENV['APP_DEBUG'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
    $debugScript = $_SERVER['SCRIPT_NAME'] ?? '';
    $debugUri = $_SERVER['REQUEST_URI'] ?? '/';
    $debugMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    error_log("SCRIPT_NAME: $debugScript, REQUEST_URI: $debugUri, METHOD: $debugMethod");
}

// Load the autoloader
require_once APP_PATH . DIRECTORY_SEPARATOR . 'Core' . DIRECTORY_SEPARATOR . 'Autoloader.php';

// Register the autoloader
\App\Core\Autoloader::register();

// Start session with secure settings
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path' => '/',
        'domain' => '',
        'secure' => SESSION_SECURE,
        'httponly' => SESSION_HTTPONLY,
        'samesite' => SESSION_SAMESITE,
    ]);
    session_start();
}

// Set security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Content-Type: text/html; charset=utf-8');

// Initialize and run the application
try {
    $app = \App\Core\App::getInstance();
    $app->run();
} catch (\Exception $e) {
    http_response_code(500);
    if (APP_DEBUG) {
        echo 'Error: ' . $e->getMessage();
        echo '<pre>' . $e->getTraceAsString() . '</pre>';
    } else {
        echo 'An error occurred. Please try again later.';
    }
}
