import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  appTimezone,
  fromSql,
  timezoneOffsetString,
  toSqlDateTime,
} from '../common/helpers/time.helper';

/**
 * هم‌زمان‌سازی ساعت برنامه و پایگاه داده.
 *
 * The application writes and reads wall-clock values in the application
 * timezone (common/helpers/time.helper.ts). Anything MySQL generates by itself
 * — `NOW()`, `CURRENT_TIMESTAMP`, a column DEFAULT, `DATE(created_at)` in a
 * report — uses the **session** timezone instead, which is inherited from the
 * database server and is frequently something else (very often UTC on a hosted
 * MySQL, or the machine's zone on a VPS).
 *
 * This service pins that session timezone to the application offset for every
 * pooled connection, and then verifies the two clocks actually agree, logging a
 * loud warning if they do not. A silent half-hour drift is what makes OTP codes
 * expire on arrival, cooldowns misfire and monthly reports bucket rows into the
 * wrong month; it should never be silent again.
 */
/**
 * Pins the MySQL session clock of a data source to the application timezone.
 *
 * Exported on its own so scripts (seeders, one-off maintenance) get the same
 * guarantee as the running application without booting Nest.
 */
export async function syncDatabaseTimezone(dataSource: DataSource): Promise<void> {
  if (dataSource.options.type !== 'mysql') return;

  const offset = timezoneOffsetString();
  const driver = dataSource.driver as unknown as {
    pool?: { on?: (event: string, listener: (connection: unknown) => void) => void };
  };

  const pool = driver.pool;
  if (pool && typeof pool.on === 'function') {
    pool.on('connection', (connection: unknown) => {
      const conn = connection as { query?: (sql: string, cb?: () => void) => void };
      try {
        conn.query?.(`SET time_zone = '${offset}'`, () => undefined);
      } catch {
        // Never take the application down over a session variable; the drift
        // check below reports the consequence if it ever matters.
      }
    });
  }

  // Connections opened during initialisation (version check, first queries)
  // predate the listener above.
  await dataSource.query(`SET SESSION time_zone = '${offset}'`);
  await dataSource.query(`SET GLOBAL time_zone = '${offset}'`).catch(() => {
    // Requires SUPER / SYSTEM_VARIABLES_ADMIN; the per-connection hook is
    // enough on hosts where the application user may not set it.
  });
}

@Injectable()
export class DatabaseTimezoneService implements OnApplicationBootstrap {
  private readonly logger = new Logger('DatabaseTimezone');

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    const timeZone = appTimezone();
    const offset = timezoneOffsetString();

    if (this.dataSource.options.type !== 'mysql') {
      // SQLite (dev fallback) has no session timezone: the shim already works
      // in the process timezone, which is the application timezone.
      this.logger.log(`Application timezone: ${timeZone} (${offset})`);
      return;
    }

    try {
      await syncDatabaseTimezone(this.dataSource);
      await this.verifyClocks(timeZone, offset);
    } catch (error) {
      this.logger.warn(
        `Could not synchronise the database timezone (${(error as Error).message}). ` +
          'Date values may drift; set the MySQL session/global time_zone manually.',
      );
    }
  }

  /** Compares the database clock with the application clock. */
  private async verifyClocks(timeZone: string, offset: string): Promise<void> {
    const rows: Array<{ db_now: string | Date }> = await this.dataSource.query(
      'SELECT NOW() AS db_now',
    );
    const dbNow = fromSql(rows?.[0]?.db_now);
    if (!dbNow) return;

    const driftSeconds = Math.round(Math.abs(dbNow.getTime() - Date.now()) / 1000);
    const summary =
      `Application timezone: ${timeZone} (${offset}); ` +
      `database NOW() = ${toSqlDateTime(dbNow)}, application now = ${toSqlDateTime(new Date())}`;

    if (driftSeconds > 120) {
      this.logger.warn(
        `${summary} — the two clocks differ by ${driftSeconds}s. ` +
          'Check the MySQL server time_zone and the host clock: OTP codes, ' +
          'cooldowns and monthly reports depend on them agreeing.',
      );
      return;
    }

    this.logger.log(`${summary} — in sync (${driftSeconds}s drift).`);
  }
}
