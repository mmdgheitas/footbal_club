import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Classroom } from './classroom.entity';
import { User } from './user.entity';

export enum AlertTargetType {
  ALL = 'all',
  CLASS = 'class',
  AGE_RANGE = 'age_range',
  PLAYER = 'player',
  POSITION = 'position',
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/** fc_alerts */
@Entity('fc_alerts')
export class Alert extends BaseEntity {
  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Index('idx_target_audience')
  @Column({ name: 'target_audience', type: 'varchar', length: 100, nullable: true })
  targetAudience: string | null;

  @Index('idx_target_type')
  @Column({
    name: 'target_type',
    type: 'enum',
    enum: AlertTargetType,
    nullable: true,
    default: AlertTargetType.ALL,
  })
  targetType: AlertTargetType | null;

  /** FK -> fc_classrooms(id) */
  @Index('idx_target_id')
  @Column({ name: 'target_id', type: 'int', nullable: true })
  targetId: number | null;

  @ManyToOne(() => Classroom, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'target_id' })
  targetClassroom: Classroom | null;

  @Index('idx_target_age_min')
  @Column({ name: 'target_age_min', type: 'int', nullable: true })
  targetAgeMin: number | null;

  @Index('idx_target_age_max')
  @Column({ name: 'target_age_max', type: 'int', nullable: true })
  targetAgeMax: number | null;

  @Index('idx_created_by')
  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @Index('idx_priority')
  @Column({ name: 'priority', type: 'enum', enum: AlertPriority, default: AlertPriority.MEDIUM })
  priority: AlertPriority;

  @Index('idx_expires_at')
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;
}
