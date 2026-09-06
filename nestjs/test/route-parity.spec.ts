import * as fs from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Player, User } from '../src/database/entities';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

/**
 * Route parity check.
 *
 * Parses the legacy route table in app/Core/App.php and asserts that every
 * method+path is registered in the NestJS application. This is the primary
 * completeness guarantee for the controllers-first phase: a route cannot be
 * forgotten without this test failing.
 *
 * The DataSource is stubbed because no MySQL server is installable here; no
 * handler is invoked, so no SQL is exercised or simulated.
 */

interface LegacyRoute {
  method: string;
  path: string;
  controller: string;
  action: string;
}

function parseLegacyRoutes(): LegacyRoute[] {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../app/Core/App.php'),
    'utf8',
  );
  const re = /->(get|post)\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
  const routes: LegacyRoute[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    routes.push({
      method: m[1].toUpperCase(),
      // PHP {id} -> Express :id
      path: m[2].replace(/\{(\w+)\}/g, ':$1'),
      controller: m[3],
      action: m[4],
    });
  }
  return routes;
}

function registeredRoutes(app: NestExpressApplication): Set<string> {
  // Express 5 (used by NestJS 11) exposes the router as `instance.router`.
  const instance: any = (app.getHttpAdapter() as any).getInstance();
  const stack: any[] = instance?.router?.stack ?? [];

  const out = new Set<string>();
  for (const layer of stack) {
    if (!layer.route) continue;
    const p: string = layer.route.path;
    for (const method of Object.keys(layer.route.methods)) {
      out.add(`${method.toUpperCase()} ${p}`);
    }
  }
  return out;
}

/**
 * Routes added by the feature expansion — they have no legacy counterpart, so
 * they are listed here explicitly. The list is asserted in both directions:
 * every entry must be registered, and nothing outside legacy + this list may
 * appear (a stray or silently-dropped route still fails the suite).
 */
const EXPANSION_ROUTES = [
  'POST /login/otp/request',
  'GET /login/otp',
  'POST /login/otp/verify',
  'GET /login/choose',
  'POST /login/choose',
  'POST /login/otp/resend',
  'GET /guardian',
  'GET /guardian/player/:id',
  'GET /guardian/financial',
  'GET /guardian/attendance',
  'GET /guardian/cards',
  'GET /guardian/notifications',
  'POST /guardian/notifications/:id/read',
  'POST /guardian/notifications/read-all',
  'GET /app',
  'GET /app/trainings',
  'GET /app/trophies',
  'GET /app/reports',
  'GET /app/profile',
  'GET /app/notifications',
  'POST /app/notifications/:id/read',
  'POST /app/notifications/read-all',
  'GET /cards/membership/:playerId',
  'GET /cards/fifa/:playerId',
  'GET /coach',
  'GET /coach/players',
  'GET /coach/player/:id',
  'POST /coach/player/:id/performance',
  'POST /coach/player/:id/score',
  'GET /coach/trainings',
  'POST /coach/trainings',
  'GET /admin/registrations',
  'POST /admin/registrations/:id/approve',
  'POST /admin/registrations/:id/incomplete',
  'GET /admin/cards',
  'POST /admin/cards/issue/:playerId',
  'POST /admin/cards/revoke/:id',
  'GET /admin/badges',
  'POST /admin/badges/assign',
  'POST /admin/badges/remove/:id',
  'GET /admin/scores',
  'POST /admin/scores',
  'GET /admin/guardians',
  'POST /admin/guardians',
  'POST /admin/guardians/link',
  'POST /admin/guardians/unlink/:playerId',
  'GET /admin/trainings',
  'POST /admin/trainings',
  'POST /admin/trainings/:id/delete',
  'GET /admin/reports/performance',
  'GET /admin/expenses',
  'POST /admin/expenses',
  'POST /admin/expenses/:id/delete',
  'GET /admin/reports/financial',
  'GET /admin/reports/debtors',
  'POST /admin/reports/debtors/notify',
  'GET /notifications',
  'POST /notifications/:id/read',
  'POST /notifications/read-all',
];

describe('route parity with the legacy PHP application', () => {
  let app: NestExpressApplication;
  let registered: Set<string>;
  const legacy = parseLegacyRoutes();

  beforeAll(async () => {
    /**
     * Enough of a DataSource for @nestjs/typeorm to build the repository
     * providers of every TypeOrmModule.forFeature() in the app (it reads
     * entityMetadatas/options and then calls getRepository). No handler runs,
     * so nothing ever queries.
     */
    const dataSourceStub = {
      entityMetadatas: [] as unknown[],
      options: { type: 'mysql' },
      getRepository: () => ({}),
      getTreeRepository: () => ({}),
      query: async () => [],
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSourceStub)
      .overrideProvider(getRepositoryToken(User))
      .useValue({})
      .overrideProvider(getRepositoryToken(Player))
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    registered = registeredRoutes(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('parses the expected number of legacy routes', () => {
    expect(legacy.length).toBe(78);
  });

  /**
   * Controllers ported so far. Every route belonging to one of these MUST be
   * registered. Routes for controllers still to be ported are reported but not
   * asserted, so the suite stays green while the port is in progress.
   *
   * Add a controller here as soon as its module lands.
   */
  const PORTED_CONTROLLERS = new Set([
    'AuthController',
    'DashboardController',
    'PlayerController',
    'MedicalController',
    'AttendanceController',
    'ErrorController',
    'AdminController',
    'FinancialController',
    'SmsController',
    'ClassroomController',
    'AlertController',
    'PlayerPanelController',
    'AchievementController',
    'CaseNoteController',
    'DocumentController',
    'HomeworkController',
  ]);

  it('registers every route of every ported controller', () => {
    const missing = legacy
      .filter((r) => PORTED_CONTROLLERS.has(r.controller))
      .filter((r) => !registered.has(`${r.method} ${r.path}`))
      .map((r) => `${r.method} ${r.path}  (${r.controller}::${r.action})`);

    expect(missing).toEqual([]);
  });

  it('registers no unexpected extra routes', () => {
    const expected = new Set([
      ...legacy.map((r) => `${r.method} ${r.path}`),
      ...EXPANSION_ROUTES,
    ]);
    const extra = [...registered].filter((r) => !expected.has(r));
    expect(extra).toEqual([]);
  });

  it('registers every route added by the feature expansion', () => {
    const missing = EXPANSION_ROUTES.filter((r) => !registered.has(r));
    expect(missing).toEqual([]);
  });

  it('reports remaining routes to port', () => {
    const done = legacy.filter((r) => PORTED_CONTROLLERS.has(r.controller)).length;
    // eslint-disable-next-line no-console
    console.log(`route parity: ${done}/${legacy.length} ported`);
    expect(done).toBe(78);
  });
});
