<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Models\User;
use App\Helpers\SecurityHelper;

/**
 * Authentication Middleware
 * PSR-12 compliant - Handles user authentication and session management
 */
class AuthMiddleware
{
    /**
     * Check if user is authenticated
     *
     * @return bool
     */
    public static function isAuthenticated(): bool
    {
        return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
    }

    /**
     * Require authentication
     * Redirects to login if not authenticated
     *
     * @return void
     */
    public static function requireAuth(): void
    {
        if (!self::isAuthenticated()) {
            $loginUrl = (defined('APP_URL') ? APP_URL : '') . '/login';
            header('Location: ' . $loginUrl);
            exit;
        }
    }

    /**
     * Require guest (not authenticated)
     * Redirects to dashboard if authenticated
     *
     * @return void
     */
    public static function requireGuest(): void
    {
        if (self::isAuthenticated()) {
            $dashboardUrl = (defined('APP_URL') ? APP_URL : '') . '/dashboard';
            header('Location: ' . $dashboardUrl);
            exit;
        }
    }

    /**
     * Login user
     *
     * @param int $userId User ID
     * @param string $userRole User role
     * @param array $userData User data
     * @return void
     */
    public static function login(int $userId, string $userRole, array $userData): void
    {
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_role'] = $userRole;
        $_SESSION['user'] = $userData;
        $_SESSION['login_time'] = time();
        $_SESSION['ip_address'] = SecurityHelper::getClientIp();
        $_SESSION['user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? '';
    }

    /**
     * Logout user
     *
     * @return void
     */
    public static function logout(): void
    {
        session_destroy();
    }

    /**
     * Check session validity
     *
     * @return bool
     */
    public static function isSessionValid(): bool
    {
        if (!self::isAuthenticated()) {
            return false;
        }

        // Check session timeout
        if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > SESSION_LIFETIME) {
            self::logout();
            return false;
        }

        // Check IP address (prevent session hijacking)
        if (isset($_SESSION['ip_address']) && $_SESSION['ip_address'] !== SecurityHelper::getClientIp()) {
            self::logout();
            return false;
        }

        // Update session activity
        $_SESSION['login_time'] = time();

        return true;
    }

    /**
     * Get current user ID
     *
     * @return int|null
     */
    public static function getUserId(): ?int
    {
        return $_SESSION['user_id'] ?? null;
    }

    /**
     * Get current user role
     *
     * @return string|null
     */
    public static function getUserRole(): ?string
    {
        return $_SESSION['user_role'] ?? null;
    }

    /**
     * Get current user data
     *
     * @return array|null
     */
    public static function getUser(): ?array
    {
        return $_SESSION['user'] ?? null;
    }
}
