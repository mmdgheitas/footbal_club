import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import { RbacService } from '../src/common/rbac/rbac.service';
import { viewHelpers } from '../src/common/views/view.helpers';

/**
 * دسترسی مدیریت کلاس — who may manage a roster, and does the screen say so?
 *
 * The classroom controller used to compare role strings inline
 * (`role === 'super_admin'`), which meant the club administrator could be
 * locked out of «افزودن بازیکن به کلاس» by a single mismatch while every other
 * page kept working — and the page still displayed the add/remove controls, so
 * the refusal only showed up as a bare 403 after clicking.
 *
 * Access now comes from the RBAC matrix and the view hides what the viewer
 * cannot do. Both halves are pinned here.
 */

const VIEWS = path.join(__dirname, '..', 'src', 'views');
const CONTROLLER = path.join(
  __dirname,
  '..',
  'src',
  'modules',
  'classrooms',
  'classroom.controller.ts',
);

const VIEW_PERMISSIONS = ['manage_classrooms', 'view_classrooms', 'view_players'];
const MANAGE_PERMISSION = 'manage_classrooms';

const canView = (role: string): boolean => RbacService.hasAnyPermission(VIEW_PERMISSIONS, role);
const canManage = (role: string): boolean => RbacService.hasPermission(MANAGE_PERMISSION, role);

describe('classroom access rules', () => {
  it('lets the super admin manage rosters', () => {
    expect(canView('super_admin')).toBe(true);
    expect(canManage('super_admin')).toBe(true);
  });

  it('keeps the super admin able to manage even if the matrix is trimmed', () => {
    // hasPermission() short-circuits for super_admin, so no future edit of
    // ROLE_PERMISSIONS can lock the club's own administrator out.
    expect(RbacService.hasPermission('a-permission-nobody-granted', 'super_admin')).toBe(true);
  });

  it('lets staff who only read see the classroom, but not manage it', () => {
    for (const role of ['coach', 'secretary']) {
      expect(canView(role)).toBe(true);
      expect(canManage(role)).toBe(false);
    }
  });

  it('keeps families out of the staff screens entirely', () => {
    for (const role of ['player', 'guardian']) {
      expect(canView(role)).toBe(false);
      expect(canManage(role)).toBe(false);
    }
  });

  it('decides access through RBAC, never by comparing role strings', () => {
    const src = fs.readFileSync(CONTROLLER, 'utf8');
    const code = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');

    expect(code).toContain("RbacService.hasPermission('manage_classrooms'");
    expect(/getUserRole\(req\)\s*===\s*'/.test(code)).toBe(false);
  });
});

describe('the roster screen shows only what the viewer may do', () => {
  const render = (locals: Record<string, unknown>): string =>
    ejs.render(fs.readFileSync(path.join(VIEWS, 'classrooms', 'view.ejs'), 'utf8'), {
      ...viewHelpers('/'),
      classroom: { id: 1, name: 'کلاس الف' },
      roster: [
        { id: 5, name: 'علی رضایی', position: 'forward', age_category: 'u12', national_id: '001' },
      ],
      available_players: [{ id: 6, name: 'سینا رضایی', position: 'midfielder', classroom_id: null }],
      awaiting_players: [],
      csrf_token: 'TOKEN',
      ...locals,
    });

  it('gives a manager the add and remove controls', () => {
    const html = render({ can_manage: true });
    expect(html).toContain('/classroom/add-player/1');
    expect(html).toContain('/classroom/remove-player/1');
    expect(html).toContain('افزودن بازیکن جدید');
  });

  it('hides them from a viewer and explains why', () => {
    const html = render({ can_manage: false });
    expect(html).not.toContain('/classroom/add-player/1');
    expect(html).not.toContain('/classroom/remove-player/1');
    expect(html).toContain('مدیریت کلاس‌ها');
  });

  it('explains an empty list instead of implying a missing permission', () => {
    const html = render({
      can_manage: true,
      available_players: [],
      awaiting_players: [
        { id: 9, name: 'امیر نوروزی', status: 0, registration_status: 'pending' },
      ],
    });

    expect(html).toContain('بازیکن هنوز فعال/تأییدشده نیستند');
    expect(html).toContain('امیر نوروزی');
    expect(html).toContain('/admin/registrations');
  });
});

describe('a player created by the office is usable immediately', () => {
  it('stores an approved, active player from /player/store', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'modules', 'players', 'players.controller.ts'),
      'utf8',
    );
    const store = src.slice(src.indexOf("@Post('/player/store')"), src.indexOf("@Get('/player/edit"));

    // Otherwise the column default ('pending') hides the new player from coach
    // rosters, membership cards and the classroom «available players» list.
    expect(store).toContain("registration_status: 'approved'");
    expect(store).toContain('status: 1');
  });

  it('does not approve a pending registration through the edit form', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'modules', 'players', 'players.controller.ts'),
      'utf8',
    );
    const update = src.slice(src.indexOf("@Post('/player/update/:id')"));
    expect(update).not.toContain("registration_status: 'approved'");
  });
});

describe('links are relative to the host the app is served on', () => {
  const ORIGINAL = { ...process.env };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { viewBasePath, appPath } = require('../src/common/views/base-path');

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  const set = (env: Record<string, string | undefined>): void => {
    delete process.env.APP_URL;
    delete process.env.APP_BASE_PATH;
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) process.env[key] = value;
    }
  };

  it('never emits an absolute origin — that is what breaks every button behind a proxy', () => {
    // The shipped .env says APP_URL=http://localhost. Printed in front of every
    // href, it sends the browser to port 80 of the wrong host.
    set({ APP_URL: 'http://localhost' });
    expect(viewBasePath()).toBe('');

    set({ APP_URL: 'https://club.example.com' });
    expect(viewBasePath()).toBe('');

    expect(appPath('/classroom/add-player/1')).toBe('/classroom/add-player/1');
  });

  it('keeps the path of a sub-directory install', () => {
    set({ APP_URL: 'https://example.com/club' });
    expect(viewBasePath()).toBe('/club');
    expect(appPath('/players')).toBe('/club/players');

    set({ APP_URL: '/club/' });
    expect(viewBasePath()).toBe('/club');
  });

  it('prefers APP_BASE_PATH, which is what the global route prefix uses', () => {
    set({ APP_BASE_PATH: '/club', APP_URL: 'http://elsewhere.example' });
    expect(viewBasePath()).toBe('/club');
  });

  it('is empty when nothing is configured', () => {
    set({});
    expect(viewBasePath()).toBe('');
  });
});
