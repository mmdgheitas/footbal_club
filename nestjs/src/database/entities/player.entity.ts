import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Classroom } from './classroom.entity';
import { Guardian } from './guardian.entity';
import { Attendance } from './attendance.entity';
import { Payment } from './payment.entity';

export enum PlayerPosition {
  GOALKEEPER = 'goalkeeper',
  DEFENDER = 'defender',
  MIDFIELDER = 'midfielder',
  FORWARD = 'forward',
  STRIKER = 'striker',
}

export enum AgeCategory {
  U8 = 'u8',
  U10 = 'u10',
  U12 = 'u12',
  U14 = 'u14',
  U16 = 'u16',
  U18 = 'u18',
  SENIOR = 'senior',
}

/** fc_players */
@Entity('fc_players')
export class Player extends BaseEntity {
  @Index('idx_classroom_id')
  @Column({ name: 'classroom_id', type: 'int', nullable: true })
  classroomId: number | null;

  @ManyToOne(() => Classroom, (c) => c.players, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom | null;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @Index('idx_national_id')
  @Column({ name: 'national_id', type: 'varchar', length: 50, unique: true })
  nationalId: string;

  @Index('idx_position')
  @Column({ name: 'position', type: 'enum', enum: PlayerPosition })
  position: PlayerPosition;

  @Index('idx_age_category')
  @Column({
    name: 'age_category',
    type: 'enum',
    enum: AgeCategory,
    default: AgeCategory.SENIOR,
  })
  ageCategory: AgeCategory;

  @Column({ name: 'phone', type: 'varchar', length: 15, nullable: true })
  phone: string | null;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'medical_clearance', type: 'tinyint', width: 1, default: 0 })
  medicalClearance: number;

  @Index('idx_status')
  @Column({ name: 'status', type: 'tinyint', width: 1, default: 1 })
  status: number;

  @Column({ name: 'notes', type: 'longtext', nullable: true })
  notes: string | null;

  @OneToMany(() => Guardian, (g) => g.player)
  guardians: Guardian[];

  @OneToMany(() => Attendance, (a) => a.player)
  attendance: Attendance[];

  @OneToMany(() => Payment, (p) => p.player)
  payments: Payment[];
}
