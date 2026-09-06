import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum NotificationAudience {
  PLAYER = 'player',
  GUARDIAN = 'guardian',
  COACH = 'coach',
  ADMIN = 'admin',
}

export enum NotificationType {
  DEBT = 'debt',
  PERFORMANCE = 'performance',
  SCORE = 'score',
  BADGE = 'badge',
  REGISTRATION = 'registration',
  CARD = 'card',
  ATTENDANCE = 'attendance',
  TRAINING = 'training',
  SYSTEM = 'system',
}

/**
 * fc_notifications — اعلان‌های درون‌پنلی.
 *
 * In-panel only: nothing here is ever pushed to a device. `user_type` selects
 * which account table `user_id` points at (fc_users vs fc_guardians_users vs
 * fc_players), which is why there is no FK.
 */
@Entity('fc_notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_user_type')
  @Column({
    name: 'user_type',
    type: 'enum',
    enum: NotificationAudience,
  })
  userType: NotificationAudience;

  @Index('idx_user_id')
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Index('idx_type')
  @Column({
    name: 'type',
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  /** Optional deep link inside the panel. */
  @Column({ name: 'link', type: 'varchar', length: 255, nullable: true })
  link: string | null;

  @Index('idx_is_read')
  @Column({ name: 'is_read', type: 'tinyint', width: 1, default: 0 })
  isRead: number;

  /**
   * Stable key used to avoid re-creating the same automatic notification on
   * every page load (e.g. the monthly debt reminder).
   */
  @Index('idx_dedupe_key')
  @Column({ name: 'dedupe_key', type: 'varchar', length: 120, nullable: true })
  dedupeKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
