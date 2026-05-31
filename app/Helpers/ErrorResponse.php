<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Renders standalone HTTP error pages (403, 404, etc.)
 */
class ErrorResponse
{
    /**
     * Send 403 Forbidden (HTML or JSON for AJAX).
     */
    public static function forbidden(string $message = 'شما مجوز دسترسی به این بخش را ندارید.'): void
    {
        if (self::wantsJson()) {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'error' => 'Forbidden',
                'message' => $message,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        self::render(403, 'دسترسی غیرمجاز', $message);
    }

    /**
     * Send 404 Not Found page.
     */
    public static function notFound(string $message = 'صفحه‌ای که دنبال آن هستید پیدا نشد.'): void
    {
        if (self::wantsJson()) {
            http_response_code(404);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'error' => 'Not Found',
                'message' => $message,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        self::render(404, 'صفحه پیدا نشد', $message);
    }

    /**
     * Render a standalone error view and exit.
     */
    public static function render(int $code, string $title, string $message): void
    {
        http_response_code($code);

        $homeUrl = defined('APP_URL') ? APP_URL : '/';
        $isLoggedIn = isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
        $homeUrl = $isLoggedIn ? $homeUrl . '/dashboard' : $homeUrl . '/login';

        $viewFile = APP_PATH . '/Views/errors/' . $code . '.php';
        if (!file_exists($viewFile)) {
            header('Content-Type: text/html; charset=utf-8');
            echo '<h1>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h1>';
            echo '<p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p>';
            exit;
        }

        header('Content-Type: text/html; charset=utf-8');
        require $viewFile;
        exit;
    }

    private static function wantsJson(): bool
    {
        $xhr = strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'xmlhttprequest';
        $accept = $_SERVER['HTTP_ACCEPT'] ?? '';

        return $xhr || str_contains($accept, 'application/json');
    }
}
