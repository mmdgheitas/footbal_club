import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';

/** fc_guardians */
@Entity('fc_guardians')
export class Guardian extends BaseEntity {
  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, (p) => p.guardians, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'relationship', type: 'varchar', length: 100, nullable: true })
  relationship: string | null;

  @Index('idx_phone')
  @Column({ name: 'phone', type: 'varchar', length: 15 })
  phone: string;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'address', type: 'longtext', nullable: true })
  address: string | null;
}
