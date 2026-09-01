import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ALL_ENTITIES } from './entities';

/**
 * TypeORM data source targeting MySQL, matching config/database.php of the
 * legacy application (utf8mb4 / utf8mb4_unicode_ci, InnoDB, `fc_` table prefix
 * already baked into each @Entity name).
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'football_club',
  charset: 'utf8mb4',
  entities: ALL_ENTITIES,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  // Schema is owned by database/schema.sql; never let the ORM mutate it.
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  extra: {
    connectionLimit: 10,
  },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
