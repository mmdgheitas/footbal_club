import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Player } from './player.entity';
import { User } from './user.entity';

/**
 * fc_player_scores — امتیازهای ثبت‌شده توسط مربی یا مدیر ارشد.
 *
 * The player's total score is the plain sum of these rows (see
 * ScoreService.totalFor) — no weighting, no decay, exactly as specified.
 */
@Entity('fc_player_scores')
export class PlayerScore {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  /** fc_users.id of the coach or super admin who granted the points. */
  @Index('idx_scored_by')
  @Column({ name: 'scored_by', type: 'int', nullable: true })
  scoredBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'scored_by' })
  scorer: User | null;

  /** May be negative (penalty points). */
  @Column({ name: 'points', type: 'int', default: 0 })
  points: number;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Index('idx_session_date')
  @Column({ name: 'session_date', type: 'date', nullable: true })
  sessionDate: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
