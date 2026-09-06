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

export enum MatchType {
  TRAINING = 'training',
  FRIENDLY = 'friendly',
  OFFICIAL = 'official',
}

/**
 * fc_player_performances — گل، پاس گل، دریبل، مسابقه و ...
 * Recorded by the player's own coach or by the super admin.
 */
@Entity('fc_player_performances')
export class PlayerPerformance {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Index('idx_recorded_by')
  @Column({ name: 'recorded_by', type: 'int', nullable: true })
  recordedBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'recorded_by' })
  recorder: User | null;

  /** Key from PERFORMANCE_TYPES (goal, assist, dribble, save, match, ...). */
  @Index('idx_type')
  @Column({ name: 'type', type: 'varchar', length: 50 })
  type: string;

  @Column({ name: 'value', type: 'int', default: 1 })
  value: number;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'match_type',
    type: 'enum',
    enum: MatchType,
    default: MatchType.TRAINING,
  })
  matchType: MatchType;

  @Index('idx_session_date')
  @Column({ name: 'session_date', type: 'date', nullable: true })
  sessionDate: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
