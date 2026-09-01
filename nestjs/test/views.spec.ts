import * as path from 'path';
import * as ejs from 'ejs';
import { viewHelpers } from '../src/common/views/view.helpers';

/**
 * Renders the ported EJS views through the real EJS engine and asserts the
 * Persian UI strings, RTL markup and CSRF plumbing survived the port.
 */
const VIEWS = path.join(__dirname, '..', 'src', 'views');
const APP_URL = '';

async function renderInLayout(view: string, data: Record<string, unknown> = {}): Promise<string> {
  const locals = { ...viewHelpers(APP_URL), assetVer: '1', ...data };
  const content = await ejs.renderFile(path.join(VIEWS, view + '.ejs'), locals, {});
  const layout = data.layout ?? 'layouts/auth';
  return ejs.renderFile(path.join(VIEWS, `${layout}.ejs`), { ...locals, content }, {});
}

describe('ported EJS views', () => {
  it('renders the login page inside the auth layout', async () => {
    const html = await renderInLayout('auth/login', {
      title: 'Login',
      csrf_token: 'TOKEN123',
      flashes: {},
    });

    expect(html).toContain('<html lang="fa" dir="rtl">');
    expect(html).toContain('ورود به باشگاه');
    expect(html).toContain('مدیریت تیم — سریع، ساده، حرفه‌ای');
    expect(html).toContain('name="_csrf_token" value="TOKEN123"');
    expect(html).toContain('action="/login"');
    expect(html).toContain('/assets/css/style.css?v=1');
    expect(html).toContain('/assets/js/main.js?v=1');
  });

  it('renders every player position option from the shared constants', async () => {
    const html = await renderInLayout('auth/register', {
      title: 'Register',
      csrf_token: 'X',
      flashes: {},
    });

    expect(html).toContain('ثبت‌نام دانش‌آموز');
    for (const label of ['دروازه‌بان', 'مدافع', 'هافبک', 'مهاجم', 'مهاجم هدف']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('حداقل ۸ کاراکتر');
  });

  it('escapes HTML in flash messages, as the PHP templates did', async () => {
    const html = await renderInLayout('auth/login', {
      title: 'Login',
      csrf_token: 'X',
      flashes: { error: ['<script>alert(1)</script>'] },
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('renders the main layout with the staff navigation', async () => {
    const html = await renderInLayout(
      'auth/login',
      {
        title: 'Dashboard',
        csrf_token: 'X',
        flashes: {},
        layout: 'layouts/main',
        user: { name: 'System Admin' },
        userRole: 'super_admin',
        currentPath: '/dashboard',
        currentYear: 2026,
      },
    );

    expect(html).toContain('has-bottom-nav');
    expect(html).toContain('System Admin');
    for (const label of ['داشبورد', 'کلاس‌ها', 'بازیکنان', 'مالی', 'حضور', 'کاربران', 'تنظیمات']) {
      expect(html).toContain(label);
    }
    // Active-state logic preserved for the current path.
    expect(html).toContain('href="/dashboard" class="active"');
  });

  it('renders the player-specific navigation for role=player', async () => {
    const html = await renderInLayout(
      'auth/login',
      {
        title: 'Panel',
        csrf_token: 'X',
        flashes: {},
        layout: 'layouts/main',
        user: { name: 'Alex' },
        userRole: 'player',
        currentPath: '/player-panel',
        currentYear: 2026,
      },
    );

    expect(html).toContain('/player-panel/homework');
    expect(html).toContain('تمرینات');
    expect(html).toContain('دستاوردها');
    // Staff-only entries must not leak into the player layout.
    expect(html).not.toContain('/admin/settings');
  });
});
