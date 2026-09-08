export * from './base.entity';
export * from './classroom.entity';
export * from './player.entity';
export * from './user.entity';
export * from './guardian.entity';
export * from './medical-record.entity';
export * from './injury.entity';
export * from './attendance.entity';
export * from './payment.entity';
export * from './payment-transaction.entity';
export * from './transaction-log.entity';
export * from './discount.entity';
export * from './file-upload.entity';
export * from './sms-log.entity';
export * from './setting.entity';
export * from './alert.entity';
export * from './audit-log.entity';
export * from './session.entity';
export * from './document-submission.entity';
export * from './homework-video.entity';
export * from './achievement.entity';
export * from './case-note.entity';
export * from './guardian-user.entity';
export * from './player-guardian.entity';
export * from './membership-card.entity';
export * from './player-score.entity';
export * from './player-badge.entity';
export * from './player-performance.entity';
export * from './expense.entity';
export * from './notification.entity';
export * from './otp-code.entity';
export * from './training-session.entity';

import { Classroom } from './classroom.entity';
import { Player } from './player.entity';
import { User } from './user.entity';
import { Guardian } from './guardian.entity';
import { MedicalRecord } from './medical-record.entity';
import { Injury } from './injury.entity';
import { Attendance } from './attendance.entity';
import { Payment } from './payment.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { TransactionLog } from './transaction-log.entity';
import { Discount } from './discount.entity';
import { FileUpload } from './file-upload.entity';
import { SmsLog } from './sms-log.entity';
import { Setting } from './setting.entity';
import { Alert } from './alert.entity';
import { AuditLog } from './audit-log.entity';
import { Session } from './session.entity';
import { DocumentSubmission } from './document-submission.entity';
import { HomeworkVideo } from './homework-video.entity';
import { Achievement } from './achievement.entity';
import { CaseNote } from './case-note.entity';
import { GuardianUser } from './guardian-user.entity';
import { PlayerGuardian } from './player-guardian.entity';
import { MembershipCard } from './membership-card.entity';
import { PlayerScore } from './player-score.entity';
import { PlayerBadge } from './player-badge.entity';
import { PlayerPerformance } from './player-performance.entity';
import { Expense } from './expense.entity';
import { Notification } from './notification.entity';
import { OtpCode } from './otp-code.entity';
import { TrainingSession } from './training-session.entity';

/**
 * All entities: the original 20 mapped from database/schema.sql, the 10 added
 * by the feature expansion (migrations/006_feature_expansion.sql) and the
 * payment-gateway transaction log (migrations/007_payment_gateway.sql).
 */
export const ALL_ENTITIES = [
  Classroom,
  Player,
  User,
  Guardian,
  MedicalRecord,
  Injury,
  Attendance,
  Payment,
  PaymentTransaction,
  TransactionLog,
  Discount,
  FileUpload,
  SmsLog,
  Setting,
  Alert,
  AuditLog,
  Session,
  DocumentSubmission,
  HomeworkVideo,
  Achievement,
  CaseNote,
  // --- feature expansion -------------------------------------------------
  GuardianUser,
  PlayerGuardian,
  MembershipCard,
  PlayerScore,
  PlayerBadge,
  PlayerPerformance,
  Expense,
  Notification,
  OtpCode,
  TrainingSession,
];
