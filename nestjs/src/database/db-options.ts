import { DataSourceOptions } from 'typeorm';
import * as path from 'path';
import { ALL_ENTITIES } from './entities';

/**
 * Single place where the database connection is described, shared by the Nest
 * application module, the TypeORM CLI data source and the seeder scripts.
 *
 * MySQL is the production target (unchanged). `DB_CONNECTION=sqlite` swaps in a
 * file-backed SQLite database for local development / demos on machines where
 * no MySQL server is available — see sqlite-dev.ts.
 */
export function isSqlite(): boolean {
  return (process.env.DB_CONNECTION ?? 'mysql').toLowerCase() === 'sqlite';
}

export function buildDataSourceOptions(): DataSourceOptions {
  if (isSqlite()) {
    // Loaded lazily so production (MySQL) never touches the dev shim.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sqliteDriverShim, patchSqliteTypeSupport } = require('./sqlite-dev');
    patchSqliteTypeSupport();

    const file =
      process.env.DB_SQLITE_PATH ??
      path.join(process.cwd(), '..', 'database', 'football_club.dev.sqlite');

    return {
      type: 'sqlite',
      database: file,
      driver: sqliteDriverShim,
      entities: ALL_ENTITIES,
      // The SQLite file has no hand-maintained schema: let the ORM build it
      // from the entities. MySQL keeps synchronize:false (schema.sql owns it).
      synchronize: true,
      logging: process.env.DB_LOGGING === 'true',
    } as DataSourceOptions;
  }

  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'football_club',
    charset: 'utf8mb4',
    // PDO returns DATE/DATETIME/TIMESTAMP columns as strings; mysql2 would hand
    // back JS Date objects instead. Every view formats these with the string
    // helpers, so keep them as strings for parity with the legacy app.
    dateStrings: true,
    entities: ALL_ENTITIES,
    // Schema is owned by database/schema.sql; never let the ORM mutate it.
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    extra: { connectionLimit: 10 },
  } as DataSourceOptions;
}
