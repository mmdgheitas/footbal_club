import { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';

/**
 * تجزیهٔ فرم‌های multipart بدون فایل.
 *
 * Express (and therefore NestJS) ships parsers for `application/json` and
 * `application/x-www-form-urlencoded` only. Anything sent as
 * `multipart/form-data` arrives with an **empty `req.body`** unless the route
 * itself installs multer.
 *
 * Every screen whose script does
 *
 *     fetch(form.action, { method: 'POST', body: new FormData(form) })
 *
 * sends multipart. So on those screens `_csrf_token` never reached the server
 * and the request was rejected with «Invalid CSRF token» — and with the CSRF
 * check removed, `player_id` was missing too and the answer became «Player not
 * found». That is exactly how «افزودن بازیکن به کلاس» failed, and the same held
 * for the settings, payment, SMS, medical, documents, achievements, case-note
 * and homework-review screens.
 *
 * Installed as plain Express middleware in configure-app.ts, so it never shows
 * up as a route and the route table stays exactly what the controllers declare.
 */

/**
 * Routes that install their own multer interceptor. They are skipped here —
 * parsing the same stream twice would swallow the upload.
 * `test/multipart-forms.spec.ts` checks this list against the controllers, so
 * adding an upload route without updating it fails the build.
 */
export const FILE_UPLOAD_ROUTES = [
  '/documents/store',
  '/homework/store',
  '/player/store',
  '/player/update/:id',
];

const UPLOAD_PATTERNS = FILE_UPLOAD_ROUTES.map(
  (route) => new RegExp(`^${route.replace(/:[A-Za-z]+/g, '[^/]+')}/?$`),
);

/** Fields only: a file arriving elsewhere means the route forgot its interceptor. */
const parseFields = multer({
  limits: {
    fieldSize: 1024 * 1024, // 1 MB per field
    fields: 200,
  },
}).none();

export function multipartFields(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = String(req.headers['content-type'] ?? '');
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      next();
      return;
    }

    // Strip the global prefix (APP_BASE_PATH) before matching.
    const basePath = (process.env.APP_BASE_PATH ?? '').replace(/\/+$/, '');
    const pathname = basePath && req.path.startsWith(basePath)
      ? req.path.slice(basePath.length) || '/'
      : req.path;

    if (UPLOAD_PATTERNS.some((pattern) => pattern.test(pathname))) {
      next();
      return;
    }

    parseFields(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      if ((error as { code?: string }).code === 'LIMIT_UNEXPECTED_FILE') {
        // A file was posted to a route that does not accept uploads.
        res.status(400).json({ error: 'این صفحه امکان بارگذاری فایل ندارد.' });
        return;
      }

      next(error as Error);
    });
  };
}
