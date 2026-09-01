import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Classroom } from './classroom.entity';
import { Player } from './player.entity';
import { User } from './user.entity';

export enum HomeworkStatus {
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
  APPROVED = 'approved',
}

/** fc_homework_videos */
@Entity('fc_homework_videos')
export class HomeworkVideo extends BaseEntity {
  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Index('idx_user_id')
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_classroom_id')
  @Column({ name: 'classroom_id', type: 'int', nullable: true })
  classroomId: number | null;

  @ManyToOne(() => Classroom, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom | null;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'video_path', type: 'varchar', length: 500 })
  videoPath: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ name: 'stored_filename', type: 'varchar', length: 255 })
  storedFilename: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null;

  /** Video duration in seconds */
  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number | null;

  @Index('idx_status')
  @Column({
    name: 'status',
    type: 'enum',
    enum: HomeworkStatus,
    default: HomeworkStatus.SUBMITTED,
  })
  status: HomeworkStatus;

  @Column({ name: 'coach_feedback', type: 'text', nullable: true })
  coachFeedback: string | null;

  /** Rating 1-5 */
  @Column({ name: 'coach_rating', type: 'tinyint', nullable: true })
  coachRating: number | null;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;
}
