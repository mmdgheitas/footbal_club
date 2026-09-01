import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import { viewHelpers } from '../src/common/views/view.helpers';
import { RbacService } from '../src/common/rbac/rbac.service';

/**
 * Render smoke test.
 *
 * views-compile.spec.ts only proves the templates parse. A template can compile
 * and still throw at render time on an undefined key, a bad helper call or a
 * missing constant. This spec renders all 44 views with representative data,
 * through the same two-stage composition BaseController.render() uses
 * (content first, then the layout wrapper), so a page that would 500 in the
 * browser fails here instead.
 */
const VIEWS = path.join(__dirname, '..', 'src', 'views');

/** Views rendered without the layout — ErrorResponse::render() requires them directly. */
const STANDALONE = new Set(['errors/403.ejs', 'errors/404.ejs']);

/** Layouts are composed into pages by BaseController, never rendered as pages. */
const LAYOUTS = new Set(['layouts/main.ejs', 'layouts/auth.ejs']);

function walk(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.ejs')) out.push(rel);
  }
  return out;
}

const player = {
  id: 1,
  uuid: 'u-1',
  name: 'علی رضایی',
  national_id: '0012345678',
  date_of_birth: '2012-05-14',
  position: 'forward',
  age_category: 'u12',
  phone: '09120000000',
  email: 'ali@example.com',
  notes: 'یادداشت نمونه',
  status: 1,
  medical_clearance: 1,
  classroom_id: 3,
  guardians: [
    { name: 'حسن رضایی', relationship: 'پدر', phone: '09121111111', email: 'h@example.com', address: 'تهران' },
  ],
  medical: {
    blood_type: 'O+',
    vaccination_status: 'کامل',
    last_exam_date: '2026-03-20',
    allergies: 'ندارد',
    medical_conditions: 'ندارد',
    exam_notes: 'سالم',
  },
  injuries: [
    { injury_type: 'کشیدگی عضله', severity: 'minor', date_of_injury: '2026-01-10', recovery_date: '2026-02-01', notes: '-' },
    { injury_type: 'پیچ خوردگی', severity: 'severe', date_of_injury: '2025-12-05', recovery_date: null, notes: 'در حال درمان' },
  ],
  files: { medical_clearance: { original_filename: 'm.pdf' } },
};

/** Representative locals: enough for every template to take its non-empty branch. */
const DATA: Record<string, unknown> = {
  csrf_token: 'deadbeef',
  user: { id: 1, name: 'مدیر', email: 'admin@example.com', role: 'super_admin' },
  currentUser: { id: 1, name: 'مدیر', email: 'admin@example.com', role: 'super_admin' },
  userRole: 'super_admin',
  session_date: '2026-09-01',
  session_date_jalali: '۱۴۰۵/۰۶/۱۰',
  is_admin: true,
  user_id: 1,
  settings: { club_name: 'باشگاه فوتبال', club_address: 'تهران', club_phone: '021' },
  roles: { super_admin: 'مدیر کل', coach: 'مربی', player: 'بازیکن' },
  selectedRole: 'coach',
  selected_role: 'coach',
  selected_classroom_id: 3,
  users: [
    { id: 1, name: 'مدیر', email: 'admin@example.com', role: 'super_admin', status: 1, created_at: '2026-01-02 10:00:00' },
  ],
  players: [player],
  players_list: [player],
  players_by_category: [{ age_category: 'u12', count: 12 }, { age_category: 'u14', count: 8 }],
  players_with_debt: [{ id: 1, name: 'علی رضایی', total_debt: '1500000' }],
  available_players: [player],
  player,
  player_details: player,
  player_positions: { forward: 'مهاجم', midfielder: 'هافبک' },
  positions: { forward: 'مهاجم', midfielder: 'هافبک' },
  classrooms: [{ id: 3, name: 'کلاس الف', coach_name: 'مربی یک', player_count: 12, schedule: 'شنبه' }],
  selected_classroom: { id: 3, name: 'کلاس الف', coach_name: 'مربی یک', player_count: 12, schedule: 'شنبه' },
  selected_player: player,
  roster: [player],
  search: 'علی',
  filter: { age_category: 'u12' },
  pagination: { current_page: 1, total_pages: 2, total: 20, per_page: 15 },
  stats: { total: 4, total_points: 40 },
  attendance: [{ id: 1, player_id: 1, player_name: 'علی رضایی', status: 1, session_date: '2026-09-01' }],
  attendance_map: { 1: 1 },
  attendance_status: 1,
  attendanceStatus: 1,
  attendance_rate: 87,
  attendanceRate: 87,
  attendance_warning_threshold: 70,
  low_attendance_count: 2,
  payments: [{ id: 1, player_name: 'علی رضایی', amount: '500000', status: 'paid', created_at: '2026-08-01 09:00:00' }],
  record: { id: 1, player_name: 'علی رضایی', amount: '500000', status: 'paid', created_at: '2026-08-01 09:00:00' },
  debts: [{ player_id: 1, player_name: 'علی رضایی', outstanding: '1500000' }],
  outstanding: '1500000',
  total_outstanding: '3000000',
  total_paid: '7000000',
  total_players: 20,
  percentage: 42,
  paid: '7000000',
  monthly_revenue: '1200000',
  yearly_revenue: '9000000',
  year: 1405,
  logs: [{ id: 1, recipient: '09120000000', message: 'متن', status: 'sent', created_at: '2026-08-20 12:00:00', error_message: null }],
  alerts: [
    { id: 1, title: 'اعلان', message: 'متن', priority: 'high', target_type: 'class', target_id: 3, target_age_min: 10, target_age_max: 14, target_audience: 'forward', created_at: '2026-08-30 08:00:00', expires_at: '2026-12-31 00:00:00', author_name: 'مدیر', is_read: 0 },
  ],
  recent_alerts: [],
  recentAlerts: [],
  alert: { id: 1, title: 'اعلان', message: 'متن', priority: 'high', created_at: '2026-08-30 08:00:00' },
  case_notes: [
    { id: 1, player_id: 1, player_name: 'علی رضایی', title: 'عنوان', content: 'متن', note_type: 'general', severity: 'low', is_visible_to_player: 1, created_by_name: 'مدیر', created_at: '2026-08-25 11:00:00' },
  ],
  case_note: null,
  note_types: { general: 'عمومی', medical: 'پزشکی' },
  severities: { low: 'کم', high: 'بالا' },
  achievements: [
    { id: 1, player_id: 1, player_name: 'علی رضایی', title: 'بهترین بازیکن', achievement_type: 'skill', date_achieved: '2026-08-15', points: 10, is_published: 1, created_by_name: 'مدیر', created_at: '2026-08-15 10:00:00' },
  ],
  achievement: null,
  achievement_types: { skill: 'مهارت' },
  medical: { blood_type: 'O+', vaccination_status: 'کامل', last_exam_date: '2026-03-20', allergies: 'ندارد', medical_conditions: 'ندارد', exam_notes: 'سالم' },
  injuries: [],
  videos: [{ id: 1, title: 'تمرین یک', status: 'approved', created_at: '2026-08-18 15:00:00' }],
  video: { id: 1, title: 'تمرین یک', player_name: 'علی رضایی', classroom_name: 'کلاس الف', stored_filename: 'v.mp4', mime_type: 'video/mp4', file_size: 2048000, duration_seconds: 130, description: 'توضیح', status: 'approved', created_at: '2026-08-18 15:00:00' },
  pending_documents: [
    { id: 1, user_name: 'علی رضایی', player_name: 'علی رضایی', user_email: 'ali@example.com', document_type: 'national_id', original_filename: 'id.pdf', status: 'pending', created_at: '2026-08-29 09:00:00' },
  ],
  documents: {
    national_id: { submitted: true, status: 'approved', filename: 'id.pdf', submitted_at: '2026-08-01', id: 11 },
    medical_clearance: { submitted: true, status: 'rejected', filename: 'mc.pdf', submitted_at: '2026-08-02', id: 12 },
    birth_certificate: { submitted: false, status: 'not_submitted' },
  },
  document_status: 'pending',
  requiredTypes: ['national_id', 'medical_clearance', 'birth_certificate'],
  rejection_reason: 'کیفیت نامناسب',
  content: '',
};

describe('every EJS view renders', () => {
  /**
   * Locals are split the way the app splits them, on purpose.
   *
   * APP_LOCALS mirrors the res.locals assignment in configure-app.ts and is all
   * a page gets on its first render. LAYOUT_ONLY mirrors the extra keys
   * BaseController.render() adds for the second, layout render. Folding them
   * together would let a page reference a layout-only local and still pass
   * here while throwing in production - which is exactly how the missing
   * currentYear shipped.
   */
  const APP_LOCALS = {
    ...viewHelpers('/'),
    assetVer: 'test',
    APP_DEBUG: false,
    currentYear: new Date().getFullYear(),
    hasPerm: (perm: string) => RbacService.hasPermission(perm, 'super_admin'),
    req: { method: 'GET', originalUrl: '/nope', scriptName: '/index.php' },
  };

  const LAYOUT_ONLY = {
    user: DATA.currentUser,
    userRole: 'super_admin',
    flashes: { success: ['ذخیره شد'], error: ['خطای نمونه'] },
    currentPath: '/dashboard',
  };

  const base = { ...APP_LOCALS, ...DATA };

  const views = walk(VIEWS).filter((v) => !LAYOUTS.has(v)).sort();

  it('renders all 44 templates without throwing', () => {
    // 44 legacy views, minus the 2 layouts, which are not standalone pages.
    expect(views).toHaveLength(42);

    const failures: string[] = [];
    for (const view of views) {
      const file = path.join(VIEWS, view);
      try {
        const content = ejs.render(fs.readFileSync(file, 'utf8'), base, {
          filename: file,
          views: [VIEWS],
        });
        if (!content || typeof content !== 'string') {
          failures.push(`${view}: empty render`);
          continue;
        }
        if (STANDALONE.has(view)) {
          // ErrorResponse::render() emits a complete document.
          if (!/<!DOCTYPE html>/i.test(content)) failures.push(`${view}: not a full document`);
        } else {
          // Compose through the layout exactly as BaseController.render() does.
          const layoutFile = path.join(VIEWS, 'layouts', 'main.ejs');
          const html = ejs.render(fs.readFileSync(layoutFile, 'utf8'), { ...base, ...LAYOUT_ONLY, content }, {
            filename: layoutFile,
            views: [VIEWS],
          });
          if ((html.match(/<!DOCTYPE html>/gi) || []).length !== 1) {
            failures.push(`${view}: layout produced ${html.match(/<!DOCTYPE html>/gi)?.length ?? 0} doctypes`);
          }
        }
      } catch (err) {
        failures.push(`${view}: ${(err as Error).message.replace(/\s+/g, ' ').trim()}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`render check: ${views.length - failures.length}/${views.length} views rendered`);
    expect(failures).toEqual([]);
  });
});
