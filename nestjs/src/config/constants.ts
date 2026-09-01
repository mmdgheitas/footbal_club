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
