import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GuardianUser } from './guardian-user.entity';
import { Player } from './player.entity';

/**
 * fc_player_guardians — رابطهٔ ولی ↔ بازیکن.
 *
 * A guardian may have many players; `player_id` is UNIQUE so a player has
 * exactly one guardian account (the many-to-one rule from the brief).
 */
@Entity('fc_player_guardians')
export class PlayerGuardian {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_guardian_id')
  @Column({ name: 'guardian_id', type: 'int' })
  guardianId: number;

  @ManyToOne(() => GuardianUser, (g) => g.links, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'guardian_id' })
  guardian: GuardianUser;

  /** UNIQUE — one guardian per player. */
  @Column({ name: 'player_id', type: 'int', unique: true })
  playerId: number;

  @OneToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'relationship', type: 'varchar', length: 50, nullable: true })
  relationship: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
