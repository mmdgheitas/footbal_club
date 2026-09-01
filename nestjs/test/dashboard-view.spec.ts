import * as path from 'path';
import * as ejs from 'ejs';
import { viewHelpers } from '../src/common/views/view.helpers';

/**
 * Renders the dashboard view with representative data and asserts the computed
 * values (bar percentages, revenue formatting, empty state) match what the
 * legacy PHP template would produce.
 */
const VIEWS = path.join(__dirname, '..', 'src', 'views');

async function render(view: string, data: Record<string, unknown>, layout = 'layouts/main') {
  const locals = {
    ...viewHelpers(''),
    assetVer: '1',
    currentYear: 2026,
    user: { name: 'System Admin' },
    userRole: 'super_admin',
    currentPath: '/dashboard',
    flashes: {},
    csrf_token: 'T',
    ...data,
  };
  const content = await ejs.renderFile(path.join(VIEWS, view + '.ejs'), locals, {});
  return ejs.renderFile(path.join(VIEWS, `${layout}.ejs`), { ...locals, content }, {});
}

describe('dashboard view', () => {
  const base = {
    title: 'داشبورد',
    total_players: 12,
    monthly_revenue: 1500000,
    total_outstanding: 250000,
    players_with_debt: 3,
    low_attendance_count: 2,
    attendance_warning_threshold: 75,
  };

  it('renders the four stat cards with the supplied numbers', async () => {
    const html = await render('dashboard/index', {
      ...base,
      players_by_category: [],
      yearly_revenue: [],
    });

    expect(html).toContain('بازیکنان فعال');
    expect(html).toContain('data-count="12"');
    expect(html).toContain('data-count="1500000"');
    expect(html).toContain('data-count="250000"');
    expect(html).toContain('3 بازیکن');
    expect(html).toContain('زیر 75٪ حضور');
    expect(html).toContain('data-count="2"');
  });

  it('shows the empty-state message when there are no players', async () => {
    const html = await render('dashboard/index', {
      ...base,
      players_by_category: [],
      yearly_revenue: [],
    });
    expect(html).toContain('هنوز بازیکنی ثبت نشده');
  });

  it('computes age-category bar widths relative to the largest bucket', async () => {
    const html = await render('dashboard/index', {
      ...base,
      players_by_category: [
        { age_category: 'u10', count: 8 },
        { age_category: 'u12', count: 4 },
      ],
      yearly_revenue: [],
    });

    // 8/8 -> 100%, 4/8 -> 50%
    expect(html).toContain('data-width="100"');
    expect(html).toContain('data-width="50"');
    expect(html).toContain('زیر ۱۰ سال');
    expect(html).toContain('زیر ۱۲ سال');
    expect(html).not.toContain('هنوز بازیکنی ثبت نشده');
  });

  it('maps monthly revenue into the 12 Jalali month rows', async () => {
    const html = await render('dashboard/index', {
      ...base,
      players_by_category: [],
      yearly_revenue: [{ month: 1, total: '500' }],
    });

    // 12 month rows always render.
    expect((html.match(/bar-fill-revenue/g) ?? []).length).toBe(12);
    expect(html).toContain('درآمد ماهانه (2026)');
    // Month 1 has revenue -> formatted; an empty month renders the em dash.
    expect(html).toContain('—');
  });

  it('escapes category labels coming from the database', async () => {
    const html = await render('dashboard/index', {
      ...base,
      players_by_category: [{ age_category: '<b>x</b>', count: 1 }],
      yearly_revenue: [],
    });
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
