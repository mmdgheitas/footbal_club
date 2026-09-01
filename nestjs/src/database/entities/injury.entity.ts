import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';

export enum InjurySeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
}

/** fc_injuries */
@Entity('fc_injuries')
export class Injury extends BaseEntity {
  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'injury_type', type: 'varchar', length: 100 })
  injuryType: string;

  @Column({ name: 'severity', type: 'enum', enum: InjurySeverity })
  severity: InjurySeverity;

  @Index('idx_date_of_injury')
  @Column({ name: 'date_of_injury', type: 'date' })
  dateOfInjury: string;

  @Column({ name: 'recovery_date', type: 'date', nullable: true })
  recoveryDate: string | null;

  @Column({ name: 'notes', type: 'longtext', nullable: true })
  notes: string | null;
}
