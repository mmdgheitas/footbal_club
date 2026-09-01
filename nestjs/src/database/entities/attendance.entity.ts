import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Player } from './player.entity';
import { User } from './user.entity';

/**
 * fc_attendance
 * Deviates from BaseEntity: has `recorded_at` instead of `created_at`, and no
 * `deleted_at`. Carries UNIQUE idx_player_session (player_id, session_date).
 */
@Entity('fc_attendance')
@Unique('idx_player_session', ['playerId', 'sessionDate'])
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'uuid', type: 'char', length: 36, unique: true })
  uuid: string;

  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, (p) => p.attendance, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Index('idx_session_date')
  @Column({ name: 'session_date', type: 'date' })
  sessionDate: string;

  /** 1=Present, 2=Absent, 3=Excused, 4=Late */
  @Index('idx_status')
  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'recorded_by', type: 'int', nullable: true })
  recordedBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'recorded_by' })
  recorder: User | null;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamp' })
  recordedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
