import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

/**
 * Common columns shared by most `fc_*` tables in database/schema.sql:
 *   id INT PK AUTO_INCREMENT, uuid CHAR(36) UNIQUE,
 *   created_at, updated_at, deleted_at (soft delete).
 *
 * Tables that deviate (fc_attendance, fc_transaction_logs, fc_settings,
 * fc_sessions, fc_audit_logs, fc_sms_logs) declare their columns explicitly.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'uuid', type: 'char', length: 36, unique: true })
  uuid: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
