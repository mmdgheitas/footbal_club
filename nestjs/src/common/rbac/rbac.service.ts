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
    // --- feature expansion ---------------------------------------------
    'manage_guardians',
    'manage_registrations',
    'manage_membership_cards',
    'view_membership_card',
    'record_performance',
    'view_performance',
    'record_score',
    'manage_badges',
    'manage_expenses',
    'view_expenses',
    'view_financial_reports',
    'manage_trainings',
    'view_notifications',
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
    // --- feature expansion -----------------------------------------------
    // The coach is deliberately limited: attendance, performance and points
    // for the approved players of their OWN classroom, nothing else. No
    // registration approval, no badges, no financial data, no player edits.
    'record_performance',
    'view_performance',
    'record_score',
    'view_attendance',
    'view_notifications',
  ],
  accountant: [
    'view_players',
    'view_payments',
    'record_payment',
    'generate_reports',
    'view_debts',
    'manage_discounts',
    'view_expenses',
    'view_financial_reports',
    'view_notifications',
  ],
  secretary: [
    'view_players',
    'manage_players',
    'view_payments',
    'send_sms',
    'view_attendance',
    'mark_attendance',
    'view_classrooms',
    'manage_guardians',
    'view_notifications',
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
    'view_membership_card',
    'view_performance',
    'view_notifications',
  ],
  /**
   * ولی — own children only. Every guardian route additionally verifies the
   * fc_player_guardians link, so these permissions can never reach another
   * family's data.
   */
  guardian: [
    'view_guardian_panel',
    'view_own_profile',
    'view_own_financial',
    'view_own_payments',
    'view_own_attendance',
    'view_own_alerts',
    'view_membership_card',
    'view_performance',
    'view_notifications',
    'upload_documents',
    'view_own_documents',
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
