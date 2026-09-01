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
