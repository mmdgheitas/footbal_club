/**
 * ساعت واحد برنامه — the single clock of the application.
 *
 * Why this file exists
 * --------------------
 * MySQL DATE/DATETIME/TIMESTAMP values are *wall clock* values: the string
 * `2026-09-06 14:05:00` carries no timezone. Every layer therefore has to agree
 * on which timezone that wall clock belongs to, otherwise the same instant is
 * read back shifted:
 *
 *   • TypeORM hydrates a `datetime` column with `new Date('2026-09-06 14:05:00')`,
 *     and V8 parses that format in the **process** timezone;
 *   • mysql2 converts JS `Date` values to a wall clock using its **connection**
 *     timezone (`timezone` option, default = the process timezone);
 *   • `CURRENT_TIMESTAMP`, `NOW()` and column defaults use the **MySQL session**
 *     timezone.
 *
 * Formatting a value with `toISOString()` (UTC) and letting any of the three
 * layers read it back as local time is exactly the bug that made every OTP code
 * look expired on a server running at UTC+03:30: the code was written five
 * minutes into the future in UTC, then re-read as a Tehran wall clock, i.e.
 * three and a half hours in the past.
 *
 * The rule from here on
 * ---------------------
 *   1. `APP_TIMEZONE` (default `Asia/Tehran`) is the one timezone of the club.
 *   2. `applyAppTimezone()` pins the Node process to it, so every
 *      `new Date(string)` — including TypeORM's own hydration — agrees.
 *   3. The MySQL connection and session are pinned to the same offset
 *      (see db-options.ts and database-timezone.service.ts).
 *   4. Any SQL date/datetime string is produced by `toSqlDateTime()` /
 *      `toSqlDate()` and read back with `fromSql()` — never with
 *      `toISOString()` and never with a bare `new Date(value)`.
 *
 * Everything here works with the built-in `Intl` API, so it is correct even if
 * step 2 has not run (scripts, tests) and it survives DST changes.
 */

/** Timezone of the club when APP_TIMEZONE is not set. */
export const DEFAULT_APP_TIMEZONE = 'Asia/Tehran';

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** True when the IANA name is understood by this Node build. */
export function isValidTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The configured application timezone (`APP_TIMEZONE`, else Asia/Tehran). */
export function appTimezone(): string {
  const configured = (process.env.APP_TIMEZONE ?? '').trim();
  if (!configured) return DEFAULT_APP_TIMEZONE;
  if (!isValidTimezone(configured)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[time] APP_TIMEZONE="${configured}" is not a known IANA timezone; ` +
        `falling back to ${DEFAULT_APP_TIMEZONE}.`,
    );
    return DEFAULT_APP_TIMEZONE;
  }
  return configured;
}

/**
 * Pins the Node process to the application timezone.
 *
 * Must run before the first Date is formatted or parsed — call it at the top of
 * every entry point (main.ts, configure-app.ts, the CLI data source, scripts).
 * Idempotent.
 */
export function applyAppTimezone(): string {
  const timeZone = appTimezone();
  if (process.env.TZ !== timeZone) {
    process.env.TZ = timeZone;
  }
  return timeZone;
}

/** Now. A single place to stub the clock from tests if that is ever needed. */
export function now(): Date {
  return new Date();
}

/** The wall clock of `date` in the application timezone. */
export function wallClock(date: Date = now(), timeZone: string = appTimezone()): WallClock {
  const out: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour % 24,
    minute: out.minute,
    second: out.second,
  };
}

/** Offset of the application timezone at `at`, in minutes east of UTC (+210 for Tehran). */
export function timezoneOffsetMinutes(at: Date = now(), timeZone: string = appTimezone()): number {
  const w = wallClock(at, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** The same offset as `+03:30` / `-05:00`, the form MySQL and mysql2 expect. */
export function timezoneOffsetString(at: Date = now(), timeZone: string = appTimezone()): string {
  const minutes = timezoneOffsetMinutes(at, timeZone);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** `YYYY-MM-DD HH:MM:SS` in the application timezone — for DATETIME/TIMESTAMP columns. */
export function toSqlDateTime(date: Date = now()): string {
  const w = wallClock(date);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${w.year}-${pad(w.month)}-${pad(w.day)} ` + `${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`
  );
}

/** `YYYY-MM-DD` in the application timezone — for DATE columns. */
export function toSqlDate(date: Date = now()): string {
  return toSqlDateTime(date).slice(0, 10);
}

/** `YYYY-MM` in the application timezone — for month buckets. */
export function toYearMonth(date: Date = now()): string {
  return toSqlDateTime(date).slice(0, 7);
}

/** `HH:MM` in the application timezone. */
export function toSqlTime(date: Date = now()): string {
  return toSqlDateTime(date).slice(11, 16);
}

/**
 * Reads a value coming from the database back into an absolute instant.
 *
 * Accepts what the drivers actually hand over: a `Date` (mysql2 without
 * dateStrings, or the SQLite fallback), a `YYYY-MM-DD HH:MM:SS` wall clock
 * (interpreted in the application timezone) or a full ISO string with an
 * explicit offset (respected as-is).
 */
export function fromSql(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  if (!text) return null;

  // Explicit offset (…Z or …+03:30) — already unambiguous.
  if (/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(text)) {
    const explicit = new Date(text);
    return Number.isNaN(explicit.getTime()) ? null : explicit;
  }

  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (!m) {
    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const asUtc = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4] ?? 0),
    Number(m[5] ?? 0),
    Number(m[6] ?? 0),
  );

  // Two passes so a wall clock that sits next to a DST switch still resolves
  // to the instant that formats back to the very same wall clock.
  let ts = asUtc - timezoneOffsetMinutes(new Date(asUtc)) * 60000;
  ts = asUtc - timezoneOffsetMinutes(new Date(ts)) * 60000;
  return new Date(ts);
}

/** `fromSql`, but never null — unreadable values become the epoch. */
export function fromSqlOrEpoch(value: string | Date | null | undefined): Date {
  return fromSql(value) ?? new Date(0);
}

/** A new Date `seconds` later (negative goes back). */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/** A new Date `days` later (negative goes back). */
export function addDays(date: Date, days: number): Date {
  return addSeconds(date, days * 86400);
}

/** First day of the month `months` back from `date`, as `YYYY-MM-DD`. */
export function firstDayOfMonthsAgo(months: number, date: Date = now()): string {
  const w = wallClock(date);
  const totalMonths = w.year * 12 + (w.month - 1) - months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
