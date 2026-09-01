import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '../decorators/permissions.decorator';
import { RbacService } from '../rbac/rbac.service';
import { getSessionUserRole } from '../session/session.types';

/**
 * Permission gate — replaces RbacMiddleware::requirePermission() /
 * requireAnyPermission() / requireRole().
 *
 * Routes with no @Permissions() / @Roles() metadata are allowed through (they
 * only need authentication), matching the legacy behaviour where permission
 * checks were opt-in per action.
 *
 * Denials reproduce ErrorResponse::forbidden(): JSON for AJAX requests,
 * otherwise the 403 page.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();
    const controller = context.getClass();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, controller]);
    if (isPublic) {
      return true;
    }

    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [handler, controller]) ?? [];
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, controller]) ?? [];

    const role = getSessionUserRole(req);

    if (roles.length > 0 && (!role || !roles.includes(role))) {
      this.forbidden(req, res, 'این بخش فقط برای نقش‌های مجاز در دسترس است.');
      return false;
    }

    if (required.length > 0 && !RbacService.hasAnyPermission(required, role)) {
      this.forbidden(req, res, 'شما مجوز دسترسی به این بخش را ندارید.');
      return false;
    }

    return true;
  }

  /** ErrorResponse::forbidden() — JSON for AJAX, rendered page otherwise. */
  private forbidden(req: Request, res: Response, message: string): void {
    const wantsJson =
      (req.headers['x-requested-with'] ?? '') === 'XMLHttpRequest' ||
      String(req.headers.accept ?? '').includes('application/json');

    if (wantsJson) {
      res
        .status(403)
        .type('application/json; charset=utf-8')
        .send(JSON.stringify({ error: 'Forbidden', message }));
      return;
    }

    res.status(403).render(
      'errors/403',
      {
        ...res.locals,
        title: 'دسترسی غیرمجاز',
        message,
        homeUrl: req.session?.user_id ? '/dashboard' : '/login',
      },
      (err: Error | null, html: string) => {
        if (err) {
          res.status(403).send('403 Forbidden');
          return;
        }
        res.send(html);
      },
    );
  }
}
