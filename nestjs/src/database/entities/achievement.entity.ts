import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';
import { User } from './user.entity';

export enum AchievementType {
  SKILL = 'skill',
  ATTENDANCE = 'attendance',
  SPORTSMANSHIP = 'sportsmanship',
  IMPROVEMENT = 'improvement',
  TEAMWORK = 'teamwork',
  LEADERSHIP = 'leadership',
  OTHER = 'other',
}

/** fc_achievements */
@Entity('fc_achievements')
export class Achievement extends BaseEntity {
  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Index('idx_user_id')
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Index('idx_achievement_type')
  @Column({
    name: 'achievement_type',
    type: 'enum',
    enum: AchievementType,
    default: AchievementType.SKILL,
  })
  achievementType: AchievementType;

  @Column({ name: 'points', type: 'int', nullable: true, default: 0 })
  points: number | null;

  /** schema.sql: DATE NOT NULL DEFAULT (CURRENT_DATE) */
  @Index('idx_date_achieved')
  @Column({ name: 'date_achieved', type: 'date', default: () => '(CURRENT_DATE)' })
  dateAchieved: string;

  @Index('idx_created_by')
  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @Column({ name: 'is_published', type: 'tinyint', width: 1, default: 1 })
  isPublished: number;
}
