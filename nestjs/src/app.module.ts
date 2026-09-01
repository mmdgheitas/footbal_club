import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ALL_ENTITIES } from './database/entities';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PlayersModule } from './modules/players/players.module';
import { ErrorsModule } from './modules/errors/errors.module';
import { MedicalModule } from './modules/medical/medical.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AdminModule } from './modules/admin/admin.module';
import { FinancialModule } from './modules/financial/financial.module';
import { SmsModule } from './modules/sms/sms.module';
import { ClassroomsModule } from './modules/classrooms/classroom.module';
import { AlertsModule } from './modules/alerts/alert.module';
import { PlayerPanelModule } from './modules/player-panel/player-panel.module';
import { AuthenticatedGuard } from './common/guards/authenticated.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      username: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'football_club',
      charset: 'utf8mb4',
      entities: ALL_ENTITIES,
      autoLoadEntities: true,
      // Schema is owned by database/schema.sql; never let the ORM mutate it.
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
      retryAttempts: 2,
      retryDelay: 1000,
    }),
    AuthModule,
    DashboardModule,
    PlayersModule,
    ErrorsModule,
    MedicalModule,
    AttendanceModule,
    AdminModule,
    FinancialModule,
    SmsModule,
    ClassroomsModule,
    AlertsModule,
    PlayerPanelModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthenticatedGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
