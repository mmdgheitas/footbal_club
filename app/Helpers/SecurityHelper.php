<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Security Helper
 * PSR-12 compliant - Security utilities for OWASP protection
 */
class SecurityHelper
{
    public static function escape(?string $data, string $encoding = 'UTF-8'): string
    {
        return htmlspecialchars($data ?? '', ENT_QUOTES | ENT_HTML5, $encoding);
    }

    /**
     * Escape HTML attributes
     *
     * @param string|null $data Data to escape
     * @return string
     */
    public static function escapeAttribute(?string $data): string
    {
        return htmlspecialchars($data ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Escape URL parameter
     *
     * @param string $data Data to escape
     * @return string
     */
    public static function escapeUrl(string $data): string
    {
        return rawurlencode($data);
    }

    /**
     * Escape JavaScript string
     *
     * @param string $data Data to escape
     * @return string
     */
    public static function escapeJs(string $data): string
    {
        $escaped = '';
        for ($i = 0; $i < strlen($data); $i++) {
            $char = $data[$i];
            if ($char === '"' || $char === "'" || $char === '\\' || $char === '/') {
                $escaped .= '\\' . $char;
            } elseif ($char === "\n") {
                $escaped .= '\\n';
            } elseif ($char === "\r") {
                $escaped .= '\\r';
            } elseif (ord($char) < 32) {
                $escaped .= '\\x' . str_pad(dechex(ord($char)), 2, '0', STR_PAD_LEFT);
            } else {
                $escaped .= $char;
            }
        }
        return $escaped;
    }

    /**
     * Generate CSRF token
     *
     * @param int $length Token length
     * @return string
     */
    public static function generateCsrfToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length / 2));
    }

    /**
     * Validate email
     *
     * @param string $email Email to validate
     * @return bool
     */
    public static function validateEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Validate URL
     *
     * @param string $url URL to validate
     * @return bool
     */
    public static function validateUrl(string $url): bool
    {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    /**
     * Sanitize string input
     *
     * @param string $input Input to sanitize
     * @return string
     */
    public static function sanitizeString(string $input): string
    {
        $input = trim($input);
        $input = stripslashes($input);
        $input = htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return $input;
    }

    /**
     * Sanitize SQL input (for use with prepared statements)
     *
     * @param string $input Input to sanitize
     * @return string
     */
    public static function sanitizeSql(string $input): string
    {
        // Note: Always use prepared statements instead of this function
        return str_replace(['\\', '"', "'", "\0", "\n", "\r", "\x1a"], ['\\\\', '\"', "\'", "\\0", "\\n", "\\r", "\\Z"], $input);
    }

    /**
     * Validate password strength
     *
     * @param string $password Password to validate
     * @return array ['valid' => bool, 'errors' => array]
     */
    public static function validatePasswordStrength(string $password): array
    {
        $errors = [];

        if (strlen($password) < PASSWORD_MIN_LENGTH) {
            $errors[] = 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long';
        }

        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter';
        }

        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }

        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one digit';
        }

        if (!preg_match('/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/', $password)) {
            $errors[] = 'Password must contain at least one special character';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Get client IP address
     *
     * @return string
     */
    public static function getClientIp(): string
    {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        }

        // Validate IP
        if (filter_var($ip, FILTER_VALIDATE_IP) === false) {
            return 'UNKNOWN';
        }

        return trim($ip);
    }

    /**
     * Check if URL is safe redirect
     *
     * @param string $url URL to check
     * @return bool
     */
    public static function isSafeRedirect(string $url): bool
    {
        // Check if URL is relative or belongs to same domain
        if (strpos($url, 'http://') === 0 || strpos($url, 'https://') === 0) {
            $urlParts = parse_url($url);
            $currentHost = $_SERVER['HTTP_HOST'] ?? '';
            return isset($urlParts['host']) && $urlParts['host'] === $currentHost;
        }

        // Relative URLs are safe
        return strpos($url, '/') === 0;
    }

    /**
     * Generate random token
     *
     * @param int $length Token length
     * @return string
     */
    public static function generateToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length / 2));
    }

    /**
     * Hash password
     *
     * @param string $password Password to hash
     * @return string
     */
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    }

    /**
     * Verify password
     *
     * @param string $password Plain text password
     * @param string $hash Password hash
     * @return bool
     */
    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    /**
     * Sanitize filename
     *
     * @param string $filename Filename to sanitize
     * @return string
     */
    public static function sanitizeFilename(string $filename): string
    {
        // Remove path components
        $filename = basename($filename);

        // Remove special characters except dots and hyphens
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);

        // Remove multiple consecutive dots
        $filename = preg_replace('/\.+/', '.', $filename);

        return $filename;
    }
}
