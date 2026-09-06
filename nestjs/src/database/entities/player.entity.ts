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

/** پای تخصصی */
export enum PreferredFoot {
  LEFT = 'left',
  RIGHT = 'right',
  BOTH = 'both',
}

/** وضعیت ثبت‌نام */
export enum RegistrationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  INCOMPLETE = 'incomplete',
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

  // ---------------------------------------------------------------------
  // Feature expansion — technical file, registration workflow, scoring.
  // Added by database/migrations/006_feature_expansion.sql; every column is
  // nullable or defaulted so existing rows keep working untouched.
  // ---------------------------------------------------------------------

  @Column({ name: 'father_name', type: 'varchar', length: 255, nullable: true })
  fatherName: string | null;

  @Column({ name: 'height_cm', type: 'int', nullable: true })
  heightCm: number | null;

  @Column({ name: 'weight_kg', type: 'int', nullable: true })
  weightKg: number | null;

  @Column({
    name: 'preferred_foot',
    type: 'enum',
    enum: PreferredFoot,
    nullable: true,
  })
  preferredFoot: PreferredFoot | null;

  /** 3×4 photo used by the membership card and the FIFA card. */
  @Column({ name: 'photo_path', type: 'varchar', length: 500, nullable: true })
  photoPath: string | null;

  @Column({ name: 'membership_date', type: 'date', nullable: true })
  membershipDate: string | null;

  @Index('idx_registration_status')
  @Column({
    name: 'registration_status',
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  registrationStatus: RegistrationStatus;

  /** Cached sum of fc_player_scores.points — recomputed on every write. */
  @Column({ name: 'total_score', type: 'int', default: 0 })
  totalScore: number;

  @OneToMany(() => Guardian, (g) => g.player)
  guardians: Guardian[];

  @OneToMany(() => Attendance, (a) => a.player)
  attendance: Attendance[];

  @OneToMany(() => Payment, (p) => p.player)
  payments: Payment[];
}
