import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';

/** fc_discounts — fixed amount and/or percentage */
@Entity('fc_discounts')
export class Discount extends BaseEntity {
  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int', nullable: true })
  playerId: number | null;

  @ManyToOne(() => Player, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player | null;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: string | null;

  @Column({ name: 'percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentage: string | null;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: string | null;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: string | null;

  @Index('idx_status')
  @Column({ name: 'status', type: 'tinyint', width: 1, default: 1 })
  status: number;
}
