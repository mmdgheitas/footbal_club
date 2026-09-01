/**
 * RBAC permission matrix.
 *
 * Faithful port of `app/Middleware/RbacMiddleware::$permissions` — all 42
 * permissions granted across the 5 roles, verbatim.
 *
 * NOTE: this matrix is intentionally kept as the single source of truth for
 * enforcement. The legacy app had three separate permission lists that
 * disagreed (config.php PERMISSIONS, RbacMiddleware, and
 * Controller::hasPermission). See PORT_NOTES.md §5.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
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
    'manage_classrooms',
    'manage_documents',
    'manage_alerts',
    'manage_homework',
    'manage_achievements',
    'manage_case_notes',
  ],
  coach: [
    'view_players',
    'view_player_names_ages',
    'mark_attendance',
    'view_medical',
    'view_own_payments',
    'send_sms',
    'view_homework',
    'review_homework',
  ],
  accountant: [
    'view_players',
    'view_payments',
    'record_payment',
    'generate_reports',
    'view_debts',
    'manage_discounts',
  ],
  secretary: [
    'view_players',
    'manage_players',
    'view_payments',
    'send_sms',
    'view_attendance',
    'mark_attendance',
    'view_classrooms',
  ],
  player: [
    'view_own_profile',
    'view_own_financial',
    'view_own_attendance',
    'view_own_alerts',
    'upload_documents',
    'view_own_documents',
    'upload_homework',
    'view_own_homework',
    'view_own_achievements',
    'view_own_case_notes',
  ],
};

export class RbacService {
  /**
   * Mirrors RbacMiddleware::hasPermission().
   * super_admin short-circuits to true, exactly as the legacy implementation does.
   */
  static hasPermission(permission: string, role: string | null | undefined): boolean {
    if (!role) {
      return false;
    }
    if (role === 'super_admin') {
      return true;
    }
    return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
  }

  static hasAnyPermission(permissions: string[], role: string | null | undefined): boolean {
    return permissions.some((p) => RbacService.hasPermission(p, role));
  }

  static hasAllPermissions(permissions: string[], role: string | null | undefined): boolean {
    return permissions.every((p) => RbacService.hasPermission(p, role));
  }

  static getPermissions(role: string | null | undefined): string[] {
    return role ? (ROLE_PERMISSIONS[role] ?? []) : [];
  }

  static isSuperAdmin(role: string | null | undefined): boolean {
    return role === 'super_admin';
  }
}
