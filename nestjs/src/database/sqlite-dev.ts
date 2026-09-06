/**
 * DEV-ONLY SQLite fallback.
 *
 * Production targets MySQL (see data-source.ts). This module lets the very same
 * entity layer boot against a file-backed SQLite database so the application can
 * be run, seeded and demoed on machines with no MySQL server available
 * (`DB_CONNECTION=sqlite`).
 *
 * Two things are needed to make that work:
 *
 *  1. A `sqlite3`-shaped driver. The native `sqlite3` / `better-sqlite3` packages
 *     need a compiler tool-chain; Node 22 ships `node:sqlite` instead, so we adapt
 *     it to the tiny callback surface TypeORM's SqliteDriver actually uses
 *     (`verbose()`, `new Database(path, cb)`, `run`, `all`, `close`).
 *
 *  2. MySQL column types (`enum`, `longtext`, `timestamp`, `char`, ...) mapped onto
 *     their SQLite equivalents, so the entities do not have to be rewritten.
 *
 * Nothing here is imported when DB_CONNECTION is not `sqlite`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DatabaseSync } from 'node:sqlite';
import { fromSql, toSqlDate, toSqlDateTime } from '../common/helpers/time.helper';

type Callback = (this: any, err: Error | null, rows?: any[]) => void;

/** Minimal `sqlite3.Database` implementation backed by node:sqlite. */
class Database {
  private readonly db: DatabaseSync;

  constructor(filename: string, ...rest: any[]) {
    const cb = rest.find((a) => typeof a === 'function') as
      | ((err: Error | null) => void)
      | undefined;
    try {
      this.db = new DatabaseSync(filename);
      // Reasonable defaults for a dev database.
      this.db.exec('PRAGMA journal_mode = WAL');
      Database.registerMysqlFunctions(this.db);
      // Must be asynchronous: TypeORM's SqliteDriver resolves with the `const
      // connection` binding from inside this callback, which is still in its
      // temporal dead zone while the constructor runs.
      setImmediate(() => cb?.(null));
    } catch (err) {
      setImmediate(() => cb?.(err as Error));
      throw err;
    }
  }

  /**
   * A few MySQL scalar date functions used by hand-written SQL in the legacy
   * services (dashboard revenue, ...). SQLite has strftime() instead, so the
   * names are registered here rather than rewriting production SQL.
   */
  private static registerMysqlFunctions(db: DatabaseSync): void {
    const part = (value: unknown, format: string): number | null => {
      // Stored values are wall clocks in the application timezone, so they are
      // read back with the same helper the rest of the application uses.
      const date = fromSql(value as string | Date | null | undefined);
      if (!date) return null;
      const stamp = toSqlDateTime(date);
      switch (format) {
        case 'Y':
          return Number(stamp.slice(0, 4));
        case 'm':
          return Number(stamp.slice(5, 7));
        case 'd':
          return Number(stamp.slice(8, 10));
        default:
          return null;
      }
    };

    const define = (name: string, fn: (...args: any[]) => any): void => {
      try {
        (db as any).function(name, fn);
      } catch {
        // Older Node builds without DatabaseSync#function: the affected
        // legacy pages simply stay MySQL-only in the dev fallback.
      }
    };

    define('YEAR', (v: unknown) => part(v, 'Y'));
    define('MONTH', (v: unknown) => part(v, 'm'));
    define('DAY', (v: unknown) => part(v, 'd'));
    define('CURDATE', () => toSqlDate());
    define('NOW', () => toSqlDateTime());
  }

  /**
   * SQLite's `datetime('now')` — which TypeORM emits for CreateDateColumn /
   * UpdateDateColumn defaults — is always UTC, while everything else in the
   * application works in the application timezone. Rewriting it to
   * `datetime('now', 'localtime')` keeps the dev fallback on the same clock as
   * MySQL (the process timezone is pinned by applyAppTimezone()).
   */
  private static localiseClock(sql: string): string {
    return sql.replace(/datetime\(\s*'now'\s*\)/gi, "datetime('now', 'localtime')");
  }

  private static bind(parameters: any[] | undefined): any[] {
    return (parameters ?? []).map((p) => {
      if (p === undefined || p === null) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      // Wall clock in the application timezone, exactly like mysql2 does with
      // its `timezone` option (see common/helpers/time.helper.ts).
      if (p instanceof Date) return toSqlDateTime(p);
      if (Buffer.isBuffer(p)) return new Uint8Array(p);
      if (typeof p === 'object') return JSON.stringify(p);
      return p;
    });
  }

  run(sql: string, paramsOrCb?: any, maybeCb?: Callback): void {
    const cb: Callback | undefined =
      typeof paramsOrCb === 'function' ? paramsOrCb : maybeCb;
    const params = typeof paramsOrCb === 'function' ? [] : paramsOrCb;
    try {
      const stmt = this.db.prepare(Database.localiseClock(sql));
      const result = stmt.run(...Database.bind(params));
      cb?.call(
        { lastID: Number(result.lastInsertRowid ?? 0), changes: Number(result.changes ?? 0) },
        null,
      );
    } catch (err) {
      cb?.call({}, err as Error);
    }
  }

  all(sql: string, paramsOrCb?: any, maybeCb?: Callback): void {
    const cb: Callback | undefined =
      typeof paramsOrCb === 'function' ? paramsOrCb : maybeCb;
    const params = typeof paramsOrCb === 'function' ? [] : paramsOrCb;
    try {
      const stmt = this.db.prepare(Database.localiseClock(sql));
      let rows: any[] = [];
      try {
        rows = stmt.all(...Database.bind(params)) as any[];
      } catch {
        // Statements that return no result set (DDL, PRAGMA writes, ...).
        stmt.run(...Database.bind(params));
      }
      cb?.call({ changes: 0, lastID: 0 }, null, rows);
    } catch (err) {
      cb?.call({}, err as Error, []);
    }
  }

  get(sql: string, paramsOrCb?: any, maybeCb?: Callback): void {
    this.all(sql, paramsOrCb, function (this: any, err, rows) {
      maybeCb ?? (typeof paramsOrCb === 'function' ? paramsOrCb : undefined);
      const cb: any = typeof paramsOrCb === 'function' ? paramsOrCb : maybeCb;
      cb?.call(this, err, rows?.[0]);
    });
  }

  exec(sql: string, cb?: (err: Error | null) => void): void {
    try {
      this.db.exec(Database.localiseClock(sql));
      cb?.(null);
    } catch (err) {
      cb?.(err as Error);
    }
  }

  serialize(fn?: () => void): void {
    fn?.();
  }

  close(cb?: (err: Error | null) => void): void {
    try {
      this.db.close();
      cb?.(null);
    } catch (err) {
      cb?.(err as Error);
    }
  }
}

/** The object TypeORM expects from `require('sqlite3')`. */
export const sqliteDriverShim = {
  Database,
  verbose(): typeof sqliteDriverShim {
    return sqliteDriverShim;
  },
};

/** MySQL column type -> SQLite column type. */
const TYPE_MAP: Record<string, string> = {
  enum: 'varchar',
  longtext: 'text',
  mediumtext: 'text',
  tinytext: 'text',
  char: 'varchar',
  timestamp: 'datetime',
  year: 'integer',
  longblob: 'blob',
  mediumblob: 'blob',
  set: 'varchar',
};

let patched = false;

/**
 * Teaches TypeORM's SQLite driver about the MySQL types used by the entities.
 * Applied to the driver instance (supportedDataTypes is an instance field).
 */
export function patchSqliteTypeSupport(): void {
  if (patched) {
    return;
  }
  patched = true;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DriverFactory } = require('typeorm/driver/DriverFactory');
  const original = DriverFactory.prototype.create;

  DriverFactory.prototype.create = function (connection: any) {
    const driver = original.call(this, connection);
    if (connection.options?.type !== 'sqlite') {
      return driver;
    }

    driver.supportedDataTypes = [...driver.supportedDataTypes, ...Object.keys(TYPE_MAP)];
    driver.withLengthColumnTypes = [...driver.withLengthColumnTypes, 'char', 'enum'];

    const normalize = driver.normalizeType.bind(driver);
    driver.normalizeType = (column: any): string => {
      const type = typeof column?.type === 'string' ? column.type : null;
      if (type && TYPE_MAP[type]) {
        return TYPE_MAP[type];
      }
      return normalize(column);
    };

    // `enum` columns must not keep their length/enum metadata in DDL.
    const createFullType = driver.createFullType.bind(driver);
    driver.createFullType = (column: any): string => {
      if (column?.type === 'enum' || column?.type === 'varchar') {
        return column.length ? `varchar(${column.length})` : 'varchar(255)';
      }
      return createFullType(column);
    };

    return driver;
  };

  // MySQL index names are scoped to their table (`idx_player_id` exists on
  // several tables); SQLite index names are global. Prefix them so the same
  // entity definitions can build a SQLite schema.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DataSource } = require('typeorm/data-source/DataSource');
  const originalBuild = DataSource.prototype.buildMetadatas;
  DataSource.prototype.buildMetadatas = async function (): Promise<void> {
    await originalBuild.call(this);
    if (this.options?.type !== 'sqlite') {
      return;
    }
    for (const entity of this.entityMetadatas) {
      for (const index of entity.indices) {
        if (index.name && !index.name.startsWith(entity.tableName)) {
          index.name = `${entity.tableName}_${index.name}`;
        }
      }
      for (const unique of entity.uniques) {
        if (unique.name && !unique.name.startsWith(entity.tableName)) {
          unique.name = `${entity.tableName}_${unique.name}`;
        }
      }
    }
  };
}

