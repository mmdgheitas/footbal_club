import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { buildDataSourceOptions } from './db-options';

/**
 * TypeORM CLI data source (schema:log, query, entity metadata checks…).
 *
 * The connection is described once in db-options.ts: MySQL in production
 * (utf8mb4 / utf8mb4_unicode_ci, InnoDB, `fc_` table prefix baked into each
 * @Entity name), or a file-backed SQLite database when DB_CONNECTION=sqlite
 * for local development.
 *
 * No `migrations` entry on purpose: the schema is owned by
 * database/schema.sql plus the hand-written SQL files in
 * database/migrations/*.sql, which are applied with the MySQL client rather
 * than by the ORM.
 */
export const dataSourceOptions: DataSourceOptions = buildDataSourceOptions();

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
