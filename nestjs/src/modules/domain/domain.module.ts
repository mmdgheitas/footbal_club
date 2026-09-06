import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Classroom,
  Expense,
  GuardianUser,
  MembershipCard,
  Notification,
  Player,
  PlayerBadge,
  PlayerGuardian,
  PlayerPerformance,
  PlayerScore,
  TrainingSession,
  User,
} from '../../database/entities';
import { NotificationService } from './notification.service';
import { GuardianService } from './guardian.service';
import { MembershipCardService } from './membership-card.service';
import { PlayerDevelopmentService } from './player-development.service';
import { ExpenseService } from './expense.service';
import { LedgerService } from './ledger.service';
import { CoachAccessService } from './coach-access.service';
import { TrainingService } from './training.service';
import { RegistrationService } from './registration.service';
import { DebtNotifierService } from './debt-notifier.service';

/**
 * Domain layer shared by every panel (admin, coach, guardian, player app).
 *
 * Keeping these services in one module means the access rules — coach scoping,
 * guardian ownership, «badges are super-admin only» — are written once and
 * reused, instead of being re-implemented per controller.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Player,
      User,
      Classroom,
      GuardianUser,
      PlayerGuardian,
      MembershipCard,
      PlayerScore,
      PlayerBadge,
      PlayerPerformance,
      Expense,
      Notification,
      TrainingSession,
    ]),
  ],
  providers: [
    NotificationService,
    GuardianService,
    MembershipCardService,
    PlayerDevelopmentService,
    ExpenseService,
    LedgerService,
    CoachAccessService,
    TrainingService,
    RegistrationService,
    DebtNotifierService,
  ],
  exports: [
    NotificationService,
    GuardianService,
    MembershipCardService,
    PlayerDevelopmentService,
    ExpenseService,
    LedgerService,
    CoachAccessService,
    TrainingService,
    RegistrationService,
    DebtNotifierService,
  ],
})
export class DomainModule {}
