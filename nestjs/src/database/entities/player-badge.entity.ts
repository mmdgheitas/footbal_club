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
 * fc_player_badges — نشان‌ها.
 *
 * Assignment is restricted to super_admin at the route level
 * (@Roles('super_admin') on BadgeController) and at the service level
 * (BadgeService.assign refuses any other role).
 */
@Entity('fc_player_badges')
export class PlayerBadge {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  /** Key from BADGES in config/constants (goal_machine, iron_wall, ...). */
  @Index('idx_badge_key')
  @Column({ name: 'badge_key', type: 'varchar', length: 60 })
  badgeKey: string;

  @Column({ name: 'badge_title', type: 'varchar', length: 120 })
  badgeTitle: string;

  @Column({ name: 'assigned_by', type: 'int', nullable: true })
  assignedBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'assigned_by' })
  assigner: User | null;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;

  @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
  note: string | null;
}
