import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { APP_NAME } from '../../config/constants';
import { SecurityHelper } from '../helpers/security.helper';
import { getSessionUser, getSessionUserId, getSessionUserRole } from '../session/session.types';

/**
 * Base controller — port of `app/Core/Controller.php`.
 *
 * IMPORTANT DESIGN NOTE: the legacy PHP app instantiated a fresh controller per
 * request, so it could stash request state on `$this`. NestJS controllers are
 * singletons shared across concurrent requests, so doing the same here would
 * leak one user's request into another's. Every helper therefore takes
 * `(req, res)` explicitly, and handlers obtain them via the method-level
 * `@Req()` / `@Res()` decorators.
 */
export abstract class BaseController {
  protected layout = 'layouts/main';

  /** Controller::render() + renderLayout() */
  protected render(
    req: Request,
    res: Response,
    view: string,
    data: Record<string, unknown> = {},
    statusCode?: number,
  ): void {
    // View helpers (APP_URL, esc(), Jalali, constants) are injected into
    // res.locals by the middleware in configure-app.ts.
    const locals = { ...res.locals, ...data };

    res.render(view, locals, (err: Error | null, content: string) => {
      if (err) {
        throw err;
      }
      const layoutLocals = {
        ...locals,
        user: getSessionUser(req),
        userRole: getSessionUserRole(req),
        flashes: this.getFlashes(req),
        csrf_token: this.generateCsrf(req),
        currentPath: this.getCurrentPath(req),
        currentYear: new Date().getFullYear(),
        content,
      };

      res.render(this.layout, layoutLocals, (err2: Error | null, html: string) => {
        if (err2) {
          // Legacy falls back to bare content when the layout is missing.
          res.send(content);
          return;
        }
        // ErrorResponse::render() returns a real 403/404 status code.
        if (statusCode) {
          res.status(statusCode).send(html);
          return;
        }
        res.send(html);
      });
    });
  }

  /** Controller::json() — JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES */
  protected json(res: Response, data: unknown, statusCode = 200): void {
    res
      .status(statusCode)
      .type('application/json; charset=utf-8')
      .send(JSON.stringify(data));
  }

  /** Controller::redirect() */
  protected redirect(res: Response, url: string): void {
    const base = process.env.APP_BASE_PATH ?? '';
    res.redirect(url.startsWith('/') ? base + url : url);
  }

  protected getUserId(req: Request): number | null {
    return getSessionUserId(req);
  }

  protected getUserRole(req: Request): string | null {
    return getSessionUserRole(req);
  }

  protected getUser(req: Request) {
    return getSessionUser(req);
  }

  /** Controller::getCurrentPath() — strips the application base directory. */
  protected getCurrentPath(req: Request): string {
    const path = (req.originalUrl || '/').split('?')[0];
    const base = process.env.APP_BASE_PATH ?? '';
    if (base && base !== '/' && path.startsWith(base)) {
      return path.slice(base.length) || '/';
    }
    return path;
  }

  /** Merged GET + POST/JSON body, as Controller::request() does. */
  protected input(req: Request, key?: string): any {
    const merged = { ...(req.query as object), ...(req.body as object) };
    return key === undefined ? merged : (merged as any)[key];
  }

  protected post(req: Request, key?: string): any {
    const body = (req.body ?? {}) as Record<string, unknown>;
    return key === undefined ? body : body[key];
  }

  protected query(req: Request, key?: string): any {
    const q = (req.query ?? {}) as Record<string, unknown>;
    return key === undefined ? q : q[key];
  }

  protected flash(req: Request, type: string, message: string): void {
    const session = req.session as any;
    if (!session.flash) {
      session.flash = {};
    }
    if (!session.flash[type]) {
      session.flash[type] = [];
    }
    session.flash[type].push(message);
  }

  /** Controller::getFlashes() — reads and clears. */
  protected getFlashes(req: Request): Record<string, string[]> {
    const session = req.session as any;
    const flashes = session.flash ?? {};
    delete session.flash;
    return flashes;
  }

  /** Controller::validateCsrf() — POST field, X-CSRF-Token header, or JSON body. */
  protected validateCsrf(req: Request): boolean {
    const session = req.session as any;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const token =
      body._csrf_token ?? (req.headers['x-csrf-token'] as string | undefined) ?? null;
    const sessionToken = session?._csrf_token ?? null;

    if (token == null || sessionToken == null) {
      return false;
    }
    const a = Buffer.from(String(token));
    const b = Buffer.from(String(sessionToken));
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  }

  /** Controller::generateCsrf() */
  protected generateCsrf(req: Request): string {
    const session = req.session as any;
    if (!session._csrf_token) {
      session._csrf_token = SecurityHelper.generateCsrfToken(32);
    }
    return session._csrf_token;
  }

  protected get appName(): string {
    return APP_NAME;
  }
}
