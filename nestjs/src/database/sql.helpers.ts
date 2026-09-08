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

// ---------------------------------------------------------------------------
// نتیجهٔ عملیات نوشتن — write results
//
// `DataSource.query()` returns something different per driver, and the legacy
// services read `.insertId` / `.affectedRows` straight off it:
//
//   INSERT   mysql2 → OkPacket { insertId, affectedRows }
//            sqlite → a bare number (the last row id)
//   UPDATE   mysql2 → OkPacket { affectedRows, changedRows }
//            sqlite → undefined
//
// So `result?.insertId ?? false` reports "creation failed" on SQLite even
// though the row is there, and `(result?.affectedRows ?? 0) > 0` reports
// "update failed" for every update. On MySQL the second one also fails when the
// row already held the new value — which is what made «adding a player who is
// already in that class» look like a server error.
//
// Everything that writes with raw SQL goes through these three helpers.
// ---------------------------------------------------------------------------

/** Primary key of the row just inserted, or null when the driver hid it. */
export function insertedId(result: unknown): number | null {
  if (result === null || result === undefined) return null;

  // sqlite: the last row id itself
  if (typeof result === 'number') return Number.isFinite(result) && result > 0 ? result : null;
  if (typeof result === 'string' && /^\d+$/.test(result)) return Number(result) || null;

  // mysql2: OkPacket / ResultSetHeader
  const packet = result as { insertId?: unknown };
  if (packet.insertId !== undefined && packet.insertId !== null) {
    const id = Number(packet.insertId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  // some drivers answer [rows, meta]
  if (Array.isArray(result)) {
    for (const item of result) {
      const id = insertedId(item);
      if (id !== null) return id;
    }
  }
  return null;
}

/**
 * Rows the statement matched, or `null` when the driver does not say.
 *
 * MySQL is configured with FOUND_ROWS (see db-options.ts), so this counts rows
 * that *matched* the WHERE clause — an UPDATE that writes the value a row
 * already had still counts as 1.
 */
export function affectedRows(result: unknown): number | null {
  if (result === null || result === undefined) return null;
  if (typeof result === 'number') return null; // sqlite insert: a row id, not a count

  const packet = result as { affectedRows?: unknown; changes?: unknown };
  if (packet.affectedRows !== undefined) {
    const n = Number(packet.affectedRows);
    return Number.isFinite(n) ? n : null;
  }
  if (packet.changes !== undefined) {
    const n = Number(packet.changes);
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(result)) {
    for (const item of result) {
      const n = affectedRows(item);
      if (n !== null) return n;
    }
  }
  return null;
}

/**
 * Did an UPDATE/DELETE go through?
 *
 * `true` when the driver reports at least one matched row, and also when it
 * reports nothing at all — the statement did not throw, and every caller has
 * already checked that the row exists. Only an explicit "0 rows matched" is a
 * failure, which is the honest answer for «this id is not there».
 */
export function wasWritten(result: unknown): boolean {
  const rows = affectedRows(result);
  return rows === null ? true : rows > 0;
}
