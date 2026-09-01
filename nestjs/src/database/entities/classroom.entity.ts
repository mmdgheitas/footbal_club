import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Player } from './player.entity';

/**
 * fc_classrooms
 * Note: schema.sql creates this table first without the coach_id FK and adds it
 * later via ALTER TABLE to break the circular reference with fc_users.
 */
@Entity('fc_classrooms')
export class Classroom extends BaseEntity {
  @Index('idx_name')
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'description', type: 'longtext', nullable: true })
  description: string | null;

  /** coach_id INT NULL — FK added by ALTER TABLE fk_classrooms_coach */
  @Index('idx_coach_id')
  @Column({ name: 'coach_id', type: 'int', nullable: true })
  coachId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'coach_id' })
  coach: User | null;

  @OneToMany(() => Player, (player) => player.classroom)
  players: Player[];
}
