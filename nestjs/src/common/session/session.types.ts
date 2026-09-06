import type { Request } from 'express';

/** Shape of the authenticated user stored in the session ($_SESSION['user']). */
export interface SessionUser {
  id: number;
  uuid?: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  player_id?: number | null;
  status?: number;
  document_status?: string | null;
  /** fc_guardians_users.id when the session belongs to a guardian. */
  guardian_id?: number | null;
  [key: string]: unknown;
}

/**
 * Session layout, mirroring the $_SESSION keys used by the legacy app
 * (AuthMiddleware::login / Controller::flash / Controller::generateCsrf).
 */
declare module 'express-session' {
  interface SessionData {
    user_id?: number;
    user_role?: string;
    user?: SessionUser;
    login_time?: number;
    ip_address?: string;
    user_agent?: string;
    _csrf_token?: string;
    flash?: Record<string, string[]>;
    _old_input?: Record<string, unknown>;
    // --- OTP login (single login page) -----------------------------------
    /** Phone the current OTP was sent to. */
    otp_phone?: string;
    otp_sent_at?: number;
    /** Only set when SMS is mocked, so demo logins are possible. */
    otp_dev_code?: string | null;
    /** Candidate identities when one phone matches several panels. */
    otp_identities?: unknown[];
    otp_verified_phone?: string;
    // --- resolved identity -----------------------------------------------
    guardian_id?: number | null;
    player_id?: number | null;
    login_phone?: string;
  }
}

export function getSessionUserId(req: Request): number | null {
  const id = req.session?.user_id;
  return typeof id === 'number' && id > 0 ? id : null;
}

export function getSessionUserRole(req: Request): string | null {
  return req.session?.user_role ?? null;
}

export function getSessionUser(req: Request): SessionUser | null {
  return req.session?.user ?? null;
}

export function isAuthenticated(req: Request): boolean {
  return getSessionUserId(req) !== null;
}

/** fc_guardians_users.id of the signed-in guardian, if any. */
export function getSessionGuardianId(req: Request): number | null {
  const id = req.session?.guardian_id ?? (req.session?.user as SessionUser | undefined)?.guardian_id;
  return typeof id === 'number' && id > 0 ? id : null;
}

/** fc_players.id linked to the signed-in user, if any. */
export function getSessionPlayerId(req: Request): number | null {
  const direct = req.session?.player_id;
  if (typeof direct === 'number' && direct > 0) {
    return direct;
  }
  const fromUser = (req.session?.user as SessionUser | undefined)?.player_id;
  return typeof fromUser === 'number' && fromUser > 0 ? fromUser : null;
}
