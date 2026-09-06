import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { buildDataSourceOptions } from './database/db-options';
import { HomeModule } from './modules/home/home.module';
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
import { AchievementsModule } from './modules/achievements/achievement.module';
import { CaseNotesModule } from './modules/case-notes/case-note.module';
import { DocumentsModule } from './modules/documents/document.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { DomainModule } from './modules/domain/domain.module';
import { GuardianPanelModule } from './modules/guardian/guardian-panel.module';
import { PlayerAppModule } from './modules/player-app/player-app.module';
import { CardsModule } from './modules/cards/cards.module';
import { CoachModule } from './modules/coach/coach.module';
import { ClubAdminModule } from './modules/club-admin/club-admin.module';
import { DatabaseTimezoneService } from './database/database-timezone.service';
import { AuthenticatedGuard } from './common/guards/authenticated.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    TypeOrmModule.forRoot({
      // MySQL in production; DB_CONNECTION=sqlite swaps in a file database for
      // local development and demos. See database/db-options.ts.
      ...buildDataSourceOptions(),
      autoLoadEntities: true,
      retryAttempts: 2,
      retryDelay: 1000,
    }),
    HomeModule,
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
    AchievementsModule,
    CaseNotesModule,
    DocumentsModule,
    HomeworkModule,
    // --- feature expansion -------------------------------------------------
    DomainModule,
    GuardianPanelModule,
    PlayerAppModule,
    CardsModule,
    CoachModule,
    ClubAdminModule,
  ],
  providers: [
    // Keeps the MySQL session clock on the application timezone and warns when
    // the two clocks drift apart.
    DatabaseTimezoneService,
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
