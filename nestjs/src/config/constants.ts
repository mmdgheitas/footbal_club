/**
 * Application constants.
 *
 * Faithful 1:1 port of `config/config.php` from the original PHP application.
 * Every key, label and numeric value is preserved verbatim so that behaviour
 * (age buckets, attendance codes, permission strings, Persian labels) is
 * identical to the legacy system.
 */

// ---------------------------------------------------------------------------
// Application information
// ---------------------------------------------------------------------------
export const APP_NAME = 'Football Club Manager';
export const APP_DEBUG = ['1','true','yes','on'].includes(String(process.env.APP_DEBUG ?? '').toLowerCase());
export const APP_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------
export const HASH_ALGORITHM = 'bcrypt';
export const BCRYPT_COST = 12;
export const CSRF_TOKEN_LENGTH = 32;
export const PASSWORD_MIN_LENGTH = 8;

// ---------------------------------------------------------------------------
// File upload configuration  (config.php: MAX_FILE_SIZE / ALLOWED_*)
// ---------------------------------------------------------------------------
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_UPLOAD_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'doc',
  'docx',
] as const;
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export const ITEMS_PER_PAGE = 15;

// ---------------------------------------------------------------------------
// Date / time  (PHP format strings, consumed by the date helpers)
// ---------------------------------------------------------------------------
export const DATE_FORMAT = 'Y-m-d';
export const DATETIME_FORMAT = 'Y-m-d H:i:s';
export const DISPLAY_DATE_FORMAT = 'd M Y';
export const DISPLAY_DATETIME_FORMAT = 'd M Y, H:i';

// ---------------------------------------------------------------------------
// Roles  (config.php: ROLES)
// ---------------------------------------------------------------------------
export const ROLES: Record<string, string> = {
  super_admin: 'مدیر ارشد',
  coach: 'مربی',
  accountant: 'حسابدار',
  secretary: 'منشی',
  player: 'بازیکن',
};

export type Role = keyof typeof ROLES;

// ---------------------------------------------------------------------------
// Permissions  (config.php: PERMISSIONS) — 28 declared permissions
// ---------------------------------------------------------------------------
export const PERMISSIONS: Record<string, string> = {
  manage_classrooms: 'مدیریت کلاس‌ها',
  view_classrooms: 'مشاهده کلاس‌ها',
  manage_players: 'مدیریت بازیکنان',
  view_players: 'مشاهده بازیکنان',
  view_player_names_ages: 'مشاهده نام و سن بازیکنان',
  manage_documents: 'مدیریت اسناد',
  upload_documents: 'آپلود اسناد',
  view_own_documents: 'مشاهده اسناد خود',
  manage_alerts: 'مدیریت اعلانات',
  view_own_alerts: 'مشاهده اعلانات خود',
  manage_homework: 'مدیریت تمرینات',
  view_homework: 'مشاهده تمرینات',
  review_homework: 'بررسی تمرینات',
  upload_homework: 'آپلود تمرینات',
  view_own_homework: 'مشاهده تمرینات خود',
  manage_achievements: 'مدیریت دستاوردها',
  view_own_achievements: 'مشاهده دستاوردهای خود',
  manage_case_notes: 'مدیریت یادداشت‌ها',
  view_own_case_notes: 'مشاهده یادداشت‌های خود',
  manage_settings: 'مدیریت تنظیمات',
  send_sms: 'ارسال پیامک',
  view_reports: 'مشاهده گزارش‌ها',
  manage_payments: 'مدیریت پرداخت‌ها',
  view_payments: 'مشاهده پرداخت‌ها',
  mark_attendance: 'ثبت حضور و غیاب',
  view_attendance: 'مشاهده حضور و غیاب',
  view_medical: 'مشاهده اطلاعات پزشکی',
  view_all_medical: 'مشاهده تمام اطلاعات پزشکی',
};

// ---------------------------------------------------------------------------
// Payment status  (config.php: PAYMENT_STATUSES)
// ---------------------------------------------------------------------------
export const PAYMENT_STATUSES: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  completed: 'پرداخت شده',
  failed: 'ناموفق',
  refunded: 'بازپرداخت شده',
};

// ---------------------------------------------------------------------------
// Attendance  (config.php: ATTENDANCE_STATUS / ATTENDANCE_STATUS_LABELS)
// ---------------------------------------------------------------------------
export const ATTENDANCE_STATUS = {
  present: 1,
  absent: 2,
  excused: 3,
  late: 4,
} as const;

export const ATTENDANCE_STATUS_LABELS: Record<number, string> = {
  1: 'حاضر ⚽',
  2: 'غایب',
  3: 'موجه',
  4: 'تأخیر',
};

// ---------------------------------------------------------------------------
// Age categories  (config.php: AGE_CATEGORIES)
// ---------------------------------------------------------------------------
export interface AgeCategory {
  min: number;
  max: number;
  label: string;
}

export const AGE_CATEGORIES: Record<string, AgeCategory> = {
  u8: { min: 0, max: 8, label: 'زیر ۸ سال' },
  u10: { min: 9, max: 10, label: 'زیر ۱۰ سال' },
  u12: { min: 11, max: 12, label: 'زیر ۱۲ سال' },
  u14: { min: 13, max: 14, label: 'زیر ۱۴ سال' },
  u16: { min: 15, max: 16, label: 'زیر ۱۶ سال' },
  u18: { min: 17, max: 18, label: 'زیر ۱۸ سال' },
  senior: { min: 19, max: 100, label: 'بزرگسالان' },
};

// ---------------------------------------------------------------------------
// Player positions  (config.php: PLAYER_POSITIONS)
// ---------------------------------------------------------------------------
export const PLAYER_POSITIONS: Record<string, string> = {
  goalkeeper: 'دروازه‌بان',
  defender: 'مدافع',
  midfielder: 'هافبک',
  forward: 'مهاجم',
  striker: 'مهاجم هدف',
};

// ---------------------------------------------------------------------------
// Attendance warning threshold  (config.php: ATTENDANCE_WARNING_THRESHOLD)
// ---------------------------------------------------------------------------
export const ATTENDANCE_WARNING_THRESHOLD = 75; // 75% attendance required

// ---------------------------------------------------------------------------
// SMS  (config.php: SMS_PROVIDER / SMS_API_KEY / SMS_API_SECRET / SMS_FROM_NUMBER)
// ---------------------------------------------------------------------------
export const SMS_PROVIDER = process.env.SMS_PROVIDER ?? 'mock'; // twilio, nexmo, mock
export const SMS_API_KEY = process.env.SMS_API_KEY ?? '';
export const SMS_API_SECRET = process.env.SMS_API_SECRET ?? '';
export const SMS_FROM_NUMBER = process.env.SMS_FROM_NUMBER ?? '';

// ---------------------------------------------------------------------------
// Uploads  (config.php: UPLOAD_PATH / DOCS_UPLOAD_PATH / MAX_FILE_SIZE /
//           ALLOWED_UPLOAD_EXTENSIONS / ALLOWED_MIME_TYPES)
// ---------------------------------------------------------------------------
export const UPLOAD_PATH =
  process.env.UPLOAD_PATH ?? `${process.cwd()}/src/public/uploads`;
export const PLAYER_UPLOAD_PATH = `${UPLOAD_PATH}/players`;
export const DOCS_UPLOAD_PATH = `${UPLOAD_PATH}/docs`;

// MAX_FILE_SIZE / ALLOWED_UPLOAD_EXTENSIONS / ALLOWED_MIME_TYPES are
// already declared in the file-upload section above.

// ===========================================================================
// FEATURE EXPANSION — تنظیمات و برچسب‌های فارسیِ قابلیت‌های جدید
// ===========================================================================

/**
 * Guardian (ولی) is a first-class role, but guardians live in
 * `fc_guardians_users`, not in `fc_users`. It is therefore added to the label
 * map (used by the UI and the RBAC matrix) without touching the fc_users enum.
 */
export const ROLE_GUARDIAN = 'guardian';
ROLES[ROLE_GUARDIAN] = 'ولی';

/** Landing page for each role after a successful OTP login. */
export const ROLE_HOME: Record<string, string> = {
  super_admin: '/dashboard',
  accountant: '/dashboard',
  secretary: '/dashboard',
  coach: '/coach',
  guardian: '/guardian',
  player: '/app',
};

// ---------------------------------------------------------------------------
// OTP  (authentication.security)
// ---------------------------------------------------------------------------
export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 5 * 60; // ۵ دقیقه اعتبار
/** Maximum OTP requests allowed per phone number inside OTP_WINDOW_SECONDS. */
export const OTP_MAX_PER_WINDOW = 5;
export const OTP_WINDOW_SECONDS = 15 * 60;
/** Minimum delay between two OTP requests for the same phone. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
/** Wrong-code attempts allowed before a code is burned. */
export const OTP_MAX_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// وضعیت ثبت‌نام
// ---------------------------------------------------------------------------
export const REGISTRATION_STATUSES: Record<string, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأییدشده',
  incomplete: 'ناقص',
};

// ---------------------------------------------------------------------------
// پای تخصصی
// ---------------------------------------------------------------------------
export const PREFERRED_FEET: Record<string, string> = {
  right: 'راست',
  left: 'چپ',
  both: 'هر دو پا',
};

// ---------------------------------------------------------------------------
// نشان‌ها — فقط مدیر ارشد می‌تواند تعیین کند
// ---------------------------------------------------------------------------
export interface BadgeDefinition {
  title: string;
  icon: string;
  description: string;
}

export const BADGES: Record<string, BadgeDefinition> = {
  goal_machine: { title: 'گل‌زن برتر', icon: '⚽', description: 'بیشترین گل فصل' },
  playmaker: { title: 'پاسور طلایی', icon: '🎯', description: 'بیشترین پاس گل' },
  iron_wall: { title: 'دیوار دفاعی', icon: '🛡️', description: 'بهترین عملکرد دفاعی' },
  golden_glove: { title: 'دستکش طلایی', icon: '🧤', description: 'بهترین دروازه‌بان' },
  dribble_king: { title: 'سلطان دریبل', icon: '🌀', description: 'بیشترین دریبل موفق' },
  team_spirit: { title: 'روحیه تیمی', icon: '🤝', description: 'بهترین بازیکن تیمی' },
  discipline: { title: 'نظم و انضباط', icon: '🎖️', description: 'حضور کامل و منظم' },
  captain: { title: 'کاپیتان', icon: '🅲', description: 'رهبری تیم' },
  most_improved: { title: 'بیشترین پیشرفت', icon: '📈', description: 'رشد چشمگیر فنی' },
  fair_play: { title: 'بازی جوانمردانه', icon: '🕊️', description: 'اخلاق ورزشی برتر' },
  mvp: { title: 'ارزشمندترین بازیکن', icon: '🏆', description: 'بهترین بازیکن فصل' },
};

// ---------------------------------------------------------------------------
// انواع عملکرد ثبت‌شده توسط مربی
// ---------------------------------------------------------------------------
export interface PerformanceTypeDefinition {
  label: string;
  icon: string;
  /** Points automatically suggested when the coach records this event. */
  suggestedPoints: number;
}

export const PERFORMANCE_TYPES: Record<string, PerformanceTypeDefinition> = {
  goal: { label: 'گل', icon: '⚽', suggestedPoints: 5 },
  assist: { label: 'پاس گل', icon: '🎯', suggestedPoints: 3 },
  dribble: { label: 'دریبل موفق', icon: '🌀', suggestedPoints: 1 },
  save: { label: 'مهار دروازه‌بان', icon: '🧤', suggestedPoints: 3 },
  tackle: { label: 'تکل موفق', icon: '🛡️', suggestedPoints: 2 },
  pass_accuracy: { label: 'دقت پاس', icon: '🎽', suggestedPoints: 1 },
  match: { label: 'حضور در مسابقه', icon: '🏟️', suggestedPoints: 2 },
  clean_sheet: { label: 'کلین‌شیت', icon: '🚫', suggestedPoints: 4 },
  yellow_card: { label: 'کارت زرد', icon: '🟨', suggestedPoints: -2 },
  red_card: { label: 'کارت قرمز', icon: '🟥', suggestedPoints: -5 },
  feedback: { label: 'بازخورد مربی', icon: '📝', suggestedPoints: 0 },
};

export const MATCH_TYPES: Record<string, string> = {
  training: 'تمرین',
  friendly: 'دوستانه',
  official: 'رسمی',
};

// ---------------------------------------------------------------------------
// هزینه‌های باشگاه (ثبت دستی توسط مدیر ارشد)
// ---------------------------------------------------------------------------
export const EXPENSE_CATEGORIES: Record<string, string> = {
  hall: 'اجاره سالن',
  grass: 'اجاره چمن',
  office_rent: 'اجاره دفتر',
  salary: 'حقوق و دستمزد',
  equipment: 'تجهیزات',
  transport: 'ایاب و ذهاب',
  other: 'سایر',
};

export const EXPENSE_CATEGORY_ICONS: Record<string, string> = {
  hall: '🏟️',
  grass: '🌱',
  office_rent: '🏢',
  salary: '💼',
  equipment: '🎽',
  transport: '🚌',
  other: '📦',
};

// ---------------------------------------------------------------------------
// اعلان‌های درون‌پنلی
// ---------------------------------------------------------------------------
export const NOTIFICATION_TYPES: Record<string, string> = {
  debt: 'بدهی',
  performance: 'عملکرد',
  score: 'امتیاز',
  badge: 'نشان',
  registration: 'ثبت‌نام',
  card: 'کارت عضویت',
  attendance: 'حضور و غیاب',
  training: 'تمرین',
  system: 'سیستم',
};

export const NOTIFICATION_ICONS: Record<string, string> = {
  debt: '💳',
  performance: '📊',
  score: '⭐',
  badge: '🏅',
  registration: '📝',
  card: '🪪',
  attendance: '📋',
  training: '⚽',
  system: '🔔',
};

// ---------------------------------------------------------------------------
// کارت عضویت
// ---------------------------------------------------------------------------
export const CLUB_DISPLAY_NAME = process.env.CLUB_NAME ?? 'باشگاه فوتبال نواب';
export const MEMBERSHIP_CARD_PREFIX = process.env.CARD_PREFIX ?? 'NVB';
/** Physical print size demanded by the brief. */
export const MEMBERSHIP_CARD_SIZE = { widthCm: 8, heightCm: 11 };

// ---------------------------------------------------------------------------
// Permissions added by the expansion (labels for the admin UI)
// ---------------------------------------------------------------------------
Object.assign(PERMISSIONS, {
  manage_guardians: 'مدیریت ولی‌ها',
  view_guardian_panel: 'مشاهده پنل ولی',
  manage_registrations: 'تأیید و رد ثبت‌نام',
  manage_membership_cards: 'صدور کارت عضویت',
  view_membership_card: 'مشاهده کارت عضویت',
  record_performance: 'ثبت عملکرد بازیکن',
  view_performance: 'مشاهده عملکرد بازیکن',
  record_score: 'ثبت امتیاز بازیکن',
  manage_badges: 'تعیین نشان‌ها',
  manage_expenses: 'ثبت هزینه‌های باشگاه',
  view_expenses: 'مشاهده هزینه‌ها',
  view_financial_reports: 'گزارش‌های مالی',
  manage_trainings: 'مدیریت جلسات تمرین',
  view_notifications: 'مشاهده اعلان‌ها',
});

// ---------------------------------------------------------------------------
// درگاه پرداخت آنلاین — online payment gateway
//
// The gateway itself is pluggable (see modules/payments/gateways): the driver
// is chosen by PAYMENT_GATEWAY and the environment by PAYMENT_MODE, exactly the
// way SMS_PROVIDER already works. `mock` needs no network and no merchant
// account, so the whole pay flow stays clickable in development.
// ---------------------------------------------------------------------------
export const PAYMENT_GATEWAY = (process.env.PAYMENT_GATEWAY ?? 'mock').toLowerCase();
/** mock | sandbox | production */
export const PAYMENT_MODE = (process.env.PAYMENT_MODE ?? 'mock').toLowerCase();
export const PAYMENT_MERCHANT_ID = process.env.PAYMENT_MERCHANT_ID ?? '';
export const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY ?? '';
export const PAYMENT_CALLBACK_URL = process.env.PAYMENT_CALLBACK_URL ?? '';
/** Seconds a started transaction may stay unfinished before it is abandoned. */
export const PAYMENT_TIMEOUT_SECONDS = parseInt(process.env.PAYMENT_TIMEOUT ?? '900', 10);

/**
 * Amounts are stored and displayed in تومان; Iranian gateways charge in ریال.
 * PAYMENT_CURRENCY_MULTIPLIER is what the stored amount is multiplied by before
 * it is handed to the gateway (10 for toman → rial, 1 when the gateway itself
 * works in toman).
 */
export const PAYMENT_CURRENCY_MULTIPLIER = parseInt(
  process.env.PAYMENT_CURRENCY_MULTIPLIER ?? '10',
  10,
);

/** Minimum an online payment may be, in تومان (gateways reject dust amounts). */
export const PAYMENT_MIN_AMOUNT = parseInt(process.env.PAYMENT_MIN_AMOUNT ?? '1000', 10);

export const PAYMENT_MODES: Record<string, string> = {
  mock: 'شبیه‌ساز (بدون پرداخت واقعی)',
  sandbox: 'محیط آزمایشی درگاه',
  production: 'درگاه واقعی',
};

/** Lifecycle of one attempt at the gateway (fc_payment_transactions.status). */
export const PAYMENT_TRANSACTION_STATUSES: Record<string, string> = {
  initiated: 'در حال انتقال به درگاه',
  pending: 'در انتظار بازگشت از درگاه',
  paid: 'پرداخت‌شده (در انتظار تأیید)',
  verified: 'تأیید نهایی شد',
  failed: 'ناموفق',
  canceled: 'لغو توسط کاربر',
};

export const PAYMENT_TRANSACTION_ICONS: Record<string, string> = {
  initiated: '🔄',
  pending: '⏳',
  paid: '💳',
  verified: '✅',
  failed: '❌',
  canceled: '🚫',
};

Object.assign(PERMISSIONS, {
  manage_invoices: 'صدور صورتحساب',
  pay_online: 'پرداخت آنلاین',
  view_payment_transactions: 'مشاهده تراکنش‌های درگاه',
});
