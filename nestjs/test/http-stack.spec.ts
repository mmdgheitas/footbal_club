import { Test } from '@nestjs/testing';

import { NestExpressApplication } from '@nestjs/platform-express';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { Player, User } from '../src/database/entities';

/**
 * HTTP smoke test for the real Nest stack: module graph, global auth guard,
 * express-session, EJS view resolution and static asset serving.
 *
 * No MySQL server exists in this sandbox, so the DataSource and repository
 * providers are replaced with inert stubs via Nest's own DI override API.
 * The routes exercised here are @Public() and issue no queries, so nothing
 * about the SQL layer is being simulated or asserted.
 */
describe('HTTP stack (no database)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getDataSourceToken())
      .useValue({})
      .overrideProvider(getRepositoryToken(User))
      .useValue({})
      .overrideProvider(getRepositoryToken(Player))
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /login returns the Persian login page', async () => {
    const res = await request(app.getHttpServer()).get('/login').expect(200);

    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    expect(res.text).toContain('<html lang="fa" dir="rtl">');
    expect(res.text).toContain('ورود به باشگاه');
    expect(res.text).toContain('name="_csrf_token"');
  });

  it('issues a session cookie with httpOnly set', async () => {
    const res = await request(app.getHttpServer()).get('/login').expect(200);
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('FCSESSID=');
    expect(cookie).toContain('HttpOnly');
  });

  it('embeds a real CSRF token that is stable within a session', async () => {
    const agent = request.agent(app.getHttpServer());
    const first = await agent.get('/login').expect(200);
    const token = /name="_csrf_token" value="([a-f0-9]+)"/.exec(first.text)?.[1];

    expect(token).toBeDefined();
    expect(token).toHaveLength(32); // CSRF_TOKEN_LENGTH = 32

    const second = await agent.get('/register').expect(200);
    expect(second.text).toContain(`name="_csrf_token" value="${token}"`);
  });

  it('GET /register renders the signup form with all positions', async () => {
    const res = await request(app.getHttpServer()).get('/register').expect(200);
    expect(res.text).toContain('ثبت‌نام دانش‌آموز');
    expect(res.text).toContain('دروازه‌بان');
    expect(res.text).toContain('مهاجم هدف');
  });

  // NOTE: the unauthenticated -> /login redirect for protected routes is
  // covered once the first protected module (players) is ported; no protected
  // route exists yet.

  /**
   * Regression: AuthController::logout() flashes from inside the
   * req.session.destroy() callback, where express-session has already nulled
   * req.session. Unguarded, that threw "Cannot read properties of undefined
   * (reading 'flash')" and 500'd the request. Needs the real session
   * middleware, so it belongs here rather than in sessionless.spec.ts.
   */
  it('GET /logout redirects instead of throwing when the session is gone', async () => {
    const res = await request(app.getHttpServer()).get('/logout');
    expect([301, 302]).toContain(res.status);
    expect(res.headers.location).toBe('/login');
    // Explicit cap: when this regressed the throw happened inside the destroy
    // callback, so the response was never sent and the request hung rather
    // than failing. Without a timeout the whole suite stalls with it.
  }, 10000);

  it('serves the copied static assets', async () => {
    const css = await request(app.getHttpServer()).get('/assets/css/style.css').expect(200);
    expect(css.headers['content-type']).toContain('text/css');

    const js = await request(app.getHttpServer()).get('/assets/js/main.js').expect(200);
    expect(js.text).toContain('APP');
  });
});
