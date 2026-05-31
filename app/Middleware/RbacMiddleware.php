<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Helpers\ErrorResponse;

/**
 * RBAC (Role-Based Access Control) Middleware
 * PSR-12 compliant - Manages permissions and authorization
 */
class RbacMiddleware
{
    /**
     * Permission matrix
     */
    private static array $permissions = [
        'super_admin' => [
            'view_all_players',
            'manage_all_players',
            'view_all_payments',
            'manage_payments',
            'manage_users',
            'manage_settings',
            'view_all_medical',
            'manage_sms',
            'view_reports',
            'manage_roles',
        ],
        'coach' => [
            'view_players',
            'edit_player_profile',
            'mark_attendance',
            'view_medical',
            'view_own_payments',
            'send_sms',
        ],
        'accountant' => [
            'view_players',
            'view_payments',
            'record_payment',
            'generate_reports',
            'view_debts',
            'manage_discounts',
        ],
        'secretary' => [
            'view_players',
            'manage_players',
            'view_payments',
            'send_sms',
            'view_attendance',
            'mark_attendance',
        ],
    ];

    /**
     * Check if user has permission
     *
     * @param string $permission Permission name
     * @param string|null $role User role (uses current if null)
     * @return bool
     */
    public static function hasPermission(string $permission, ?string $role = null): bool
    {
        $userRole = $role ?? AuthMiddleware::getUserRole();

        if ($userRole === null) {
            return false;
        }

        if ($userRole === 'super_admin') {
            return true;
        }

        return in_array($permission, self::$permissions[$userRole] ?? [], true);
    }

    /**
     * Check if user has any of the permissions
     *
     * @param array $permissions Permission names
     * @param string|null $role User role
     * @return bool
     */
    public static function hasAnyPermission(array $permissions, ?string $role = null): bool
    {
        foreach ($permissions as $permission) {
            if (self::hasPermission($permission, $role)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user has all permissions
     *
     * @param array $permissions Permission names
     * @param string|null $role User role
     * @return bool
     */
    public static function hasAllPermissions(array $permissions, ?string $role = null): bool
    {
        foreach ($permissions as $permission) {
            if (!self::hasPermission($permission, $role)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Require permission
     * Responds with 403 Forbidden if not authorized
     *
     * @param string $permission Permission name
     * @return void
     */
    public static function requirePermission(string $permission): void
    {
        if (!self::hasPermission($permission)) {
            ErrorResponse::forbidden('شما مجوز انجام این عملیات را ندارید.');
        }
    }

    /**
     * Require any permission
     *
     * @param array $permissions Permission names
     * @return void
     */
    public static function requireAnyPermission(array $permissions): void
    {
        if (!self::hasAnyPermission($permissions)) {
            ErrorResponse::forbidden('شما مجوز دسترسی به این بخش را ندارید.');
        }
    }

    /**
     * Require specific role
     *
     * @param string|array $roles Role name(s)
     * @return void
     */
    public static function requireRole(string|array $roles): void
    {
        $requiredRoles = is_array($roles) ? $roles : [$roles];
        $userRole = AuthMiddleware::getUserRole();

        if ($userRole === null || !in_array($userRole, $requiredRoles, true)) {
            ErrorResponse::forbidden('این بخش فقط برای نقش‌های مجاز در دسترس است.');
        }
    }

    /**
     * Check if user is super admin
     *
     * @return bool
     */
    public static function isSuperAdmin(): bool
    {
        return AuthMiddleware::getUserRole() === 'super_admin';
    }

    /**
     * Check if user is coach
     *
     * @return bool
     */
    public static function isCoach(): bool
    {
        return AuthMiddleware::getUserRole() === 'coach';
    }

    /**
     * Check if user is accountant
     *
     * @return bool
     */
    public static function isAccountant(): bool
    {
        return AuthMiddleware::getUserRole() === 'accountant';
    }

    /**
     * Check if user is secretary
     *
     * @return bool
     */
    public static function isSecretary(): bool
    {
        return AuthMiddleware::getUserRole() === 'secretary';
    }

    /**
     * Get all permissions for role
     *
     * @param string|null $role User role
     * @return array
     */
    public static function getPermissions(?string $role = null): array
    {
        $userRole = $role ?? AuthMiddleware::getUserRole();
        return self::$permissions[$userRole] ?? [];
    }

    /**
     * Add custom permission for role
     *
     * @param string $role Role name
     * @param string $permission Permission name
     * @return void
     */
    public static function addPermission(string $role, string $permission): void
    {
        if (!isset(self::$permissions[$role])) {
            self::$permissions[$role] = [];
        }

        if (!in_array($permission, self::$permissions[$role], true)) {
            self::$permissions[$role][] = $permission;
        }
    }

    /**
     * Remove permission from role
     *
     * @param string $role Role name
     * @param string $permission Permission name
     * @return void
     */
    public static function removePermission(string $role, string $permission): void
    {
        if (isset(self::$permissions[$role])) {
            self::$permissions[$role] = array_filter(
                self::$permissions[$role],
                fn ($p) => $p !== $permission
            );
        }
    }
}
