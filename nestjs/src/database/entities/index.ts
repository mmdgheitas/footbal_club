export * from './base.entity';
export * from './classroom.entity';
export * from './player.entity';
export * from './user.entity';
export * from './guardian.entity';
export * from './medical-record.entity';
export * from './injury.entity';
export * from './attendance.entity';
export * from './payment.entity';
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

import { Classroom } from './classroom.entity';
import { Player } from './player.entity';
import { User } from './user.entity';
import { Guardian } from './guardian.entity';
import { MedicalRecord } from './medical-record.entity';
import { Injury } from './injury.entity';
import { Attendance } from './attendance.entity';
import { Payment } from './payment.entity';
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

/** All 20 entities mapped from database/schema.sql */
export const ALL_ENTITIES = [
  Classroom,
  Player,
  User,
  Guardian,
  MedicalRecord,
  Injury,
  Attendance,
  Payment,
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
];
