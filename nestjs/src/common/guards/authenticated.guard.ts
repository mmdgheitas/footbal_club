import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  IS_GUEST_ONLY_KEY,
  IS_PUBLIC_KEY,
} from '../decorators/permissions.decorator';
import { isAuthenticated } from '../session/session.types';
import { SecurityHelper } from '../helpers/security.helper';

/**
 * Session gate. Mirrors the legacy behaviour of Controller::checkAuth() and
 * AuthMiddleware::isSessionValid() — including the session-timeout and
 * IP-change invalidation, and the redirect (rather than 401) on failure.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();
    const controller = context.getClass();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, controller]);
    const guestOnly = this.reflector.getAllAndOverride<boolean>(IS_GUEST_ONLY_KEY, [
      handler,
      controller,
    ]);

    // Invalidate expired / hijacked sessions before anything else,
    // exactly as AuthMiddleware::isSessionValid() does.
    this.invalidateIfStale(req);

    if (guestOnly && isAuthenticated(req)) {
      res.redirect(this.base(req) + '/dashboard');
      return false;
    }

    if (isPublic) {
      return true;
    }

    if (!isAuthenticated(req)) {
      res.redirect(this.base(req) + '/login');
      return false;
    }

    return true;
  }

  /** AuthMiddleware::isSessionValid() */
  private invalidateIfStale(req: Request): void {
    if (!isAuthenticated(req)) {
      return;
    }
    const lifetimeMs = parseInt(process.env.SESSION_LIFETIME ?? '3600', 10) * 1000;
    const loginTime = req.session?.login_time;

    if (typeof loginTime === 'number' && Date.now() - loginTime > lifetimeMs) {
      req.session.destroy(() => undefined);
      return;
    }

    // IP pinning, as in the legacy implementation.
    const sessionIp = req.session?.ip_address;
    if (sessionIp && sessionIp !== SecurityHelper.getClientIp(req)) {
      req.session.destroy(() => undefined);
      return;
    }

    // Update session activity.
    if (req.session) {
      req.session.login_time = Date.now();
    }
  }

  private base(req: Request): string {
    return process.env.APP_BASE_PATH ?? '';
  }
}
