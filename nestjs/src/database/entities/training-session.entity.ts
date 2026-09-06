import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Classroom } from './classroom.entity';
import { User } from './user.entity';

/**
 * fc_training_sessions — تقویم جلسات تمرین.
 *
 * Backs the «تمرینات» tab of the player app (past sessions + the date of the
 * next ones) and the coach's session picker.
 */
@Entity('fc_training_sessions')
export class TrainingSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_classroom_id')
  @Column({ name: 'classroom_id', type: 'int', nullable: true })
  classroomId: number | null;

  @ManyToOne(() => Classroom, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom | null;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Index('idx_session_date')
  @Column({ name: 'session_date', type: 'date' })
  sessionDate: string;

  @Column({ name: 'start_time', type: 'varchar', length: 10, nullable: true })
  startTime: string | null;

  @Column({ name: 'location', type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
