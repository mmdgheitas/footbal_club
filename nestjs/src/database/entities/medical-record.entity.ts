import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';

/** fc_medical_records — UNIQUE INDEX idx_player_id (one record per player) */
@Entity('fc_medical_records')
export class MedicalRecord extends BaseEntity {
  @Column({ name: 'player_id', type: 'int', unique: true })
  playerId: number;

  @OneToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'blood_type', type: 'varchar', length: 10, nullable: true })
  bloodType: string | null;

  @Column({ name: 'allergies', type: 'longtext', nullable: true })
  allergies: string | null;

  @Column({ name: 'medical_conditions', type: 'longtext', nullable: true })
  medicalConditions: string | null;

  @Column({ name: 'vaccination_status', type: 'varchar', length: 100, nullable: true })
  vaccinationStatus: string | null;

  @Column({ name: 'last_exam_date', type: 'date', nullable: true })
  lastExamDate: string | null;

  @Column({ name: 'exam_notes', type: 'longtext', nullable: true })
  examNotes: string | null;
}
