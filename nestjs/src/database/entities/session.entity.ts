import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * fc_sessions — id is VARCHAR(40) (session id), not an auto-increment int.
 * Mapped for completeness; runtime sessions are handled by express-session.
 */
@Entity('fc_sessions')
export class Session {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 40 })
  id: string;

  @Index('idx_user_id')
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'data', type: 'longtext', nullable: true })
  data: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @UpdateDateColumn({ name: 'last_activity', type: 'timestamp' })
  lastActivity: Date;

  @Index('idx_expires_at')
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true, default: null })
  expiresAt: Date | null;
}
