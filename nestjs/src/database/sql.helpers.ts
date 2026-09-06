import { isSqlite } from './db-options';
import { firstDayOfMonthsAgo, toSqlDate } from '../common/helpers/time.helper';

/**
 * Small dialect helpers.
 *
 * Production runs on MySQL; the dev/demo environment can run the very same code
 * on SQLite (see sqlite-dev.ts). Only a couple of expressions actually differ,
 * so instead of duplicating queries we build those fragments here.
 */

/** 'YYYY-MM' bucket for a DATE/DATETIME column. */
export function yearMonth(column: string): string {
  return isSqlite() ? `strftime('%Y-%m', ${column})` : `DATE_FORMAT(${column}, '%Y-%m')`;
}

/** 'YYYY' bucket for a DATE/DATETIME column. */
export function year(column: string): string {
  return isSqlite() ? `strftime('%Y', ${column})` : `DATE_FORMAT(${column}, '%Y')`;
}

/** Date-only value of a DATE/DATETIME column. */
export function dateOnly(column: string): string {
  return isSqlite() ? `date(${column})` : `DATE(${column})`;
}

/** Today in the application timezone, as YYYY-MM-DD. */
export function today(): string {
  return toSqlDate();
}

/** N months back from today, as YYYY-MM-DD (first day of that month). */
export function monthsAgo(months: number): string {
  return firstDayOfMonthsAgo(months);
}
