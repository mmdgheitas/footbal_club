import 'reflect-metadata';
import { applyAppTimezone } from './common/helpers/time.helper';

// Pin the process to the club timezone (APP_TIMEZONE, default Asia/Tehran) so
// JS, TypeORM and MySQL agree on what a `YYYY-MM-DD HH:MM:SS` value means.
// buildDataSourceOptions() and configureApp() call it too, so the order in
// which the modules below are evaluated cannot matter.
const APP_TIMEZONE = applyAppTimezone();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

/** Entry point — replaces public/index.php. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(
    `Football Club Manager (NestJS) listening on 0.0.0.0:${port} (timezone: ${APP_TIMEZONE})`,
  );
}

bootstrap();
