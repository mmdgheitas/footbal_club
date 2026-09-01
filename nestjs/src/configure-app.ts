import 'reflect-metadata';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as path from 'path';
import session from 'express-session';
import { viewHelpers } from './common/views/view.helpers';

/**
 * Shared application configuration, used by both bootstrap() and the e2e tests
 * so that tests exercise exactly the production wiring (views, static assets,
 * sessions, security headers, view locals).
 *
 * Replaces the bootstrap responsibilities of public/index.php.
 */
export function configureApp(app: NestExpressApplication): void {
  const basePath = process.env.APP_BASE_PATH ?? '';
  if (basePath) {
    app.setGlobalPrefix(basePath.replace(/^\/|\/$/g, ''));
  }

  const appUrl = process.env.APP_URL ?? '';
  const assetVer = String(process.env.ASSET_VER ?? Date.now());

  // --- Views (EJS) ---------------------------------------------------------
  app.setBaseViewsDir(path.join(__dirname, 'views'));
  app.setViewEngine('ejs');

  // --- Static assets -------------------------------------------------------
  app.useStaticAssets(path.join(__dirname, 'public'));

  // --- Sessions (replaces PHP native sessions) -----------------------------
  const secure = (process.env.SESSION_SECURE ?? 'false') === 'true';
  app.use(
    session({
      name: 'FCSESSID',
      secret: process.env.SESSION_SECRET ?? 'football-club-dev-secret',
      resave: false,
      saveUninitialized: true,
      rolling: true,
      cookie: {
        maxAge: parseInt(process.env.SESSION_LIFETIME ?? '3600', 10) * 1000,
        httpOnly: (process.env.SESSION_HTTPONLY ?? 'true') === 'true',
        secure,
        sameSite: (process.env.SESSION_SAMESITE ?? 'strict').toLowerCase() as
          | 'strict'
          | 'lax'
          | 'none',
      },
    }),
  );

  // --- Security headers, matching public/index.php ------------------------
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Locals available to every view (APP_URL, esc(), Jalali helpers, constants).
  app.use((_req, res, next) => {
    Object.assign(res.locals, viewHelpers(appUrl), { assetVer });
    next();
  });
}
