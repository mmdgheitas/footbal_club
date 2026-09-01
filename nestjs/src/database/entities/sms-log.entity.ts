import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from './player.entity';

export enum SmsStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
}

/** fc_sms_logs — uuid, created_at, sent_at, updated_at (no deleted_at) */
@Entity('fc_sms_logs')
export class SmsLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'uuid', type: 'char', length: 36, unique: true })
  uuid: string;

  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int', nullable: true })
  playerId: number | null;

  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player | null;

  @Index('idx_recipient_phone')
  @Column({ name: 'recipient_phone', type: 'varchar', length: 15 })
  recipientPhone: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  /** tuition_reminder, absence_alert, etc */
  @Column({ name: 'sms_type', type: 'varchar', length: 50, nullable: true })
  smsType: string | null;

  @Column({ name: 'provider', type: 'varchar', length: 100, nullable: true })
  provider: string | null;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 100, nullable: true })
  providerMessageId: string | null;

  @Index('idx_status')
  @Column({ name: 'status', type: 'enum', enum: SmsStatus, default: SmsStatus.PENDING })
  status: SmsStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
