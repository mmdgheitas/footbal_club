import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';
import { User } from './user.entity';

export enum SubmissionDocumentType {
  NATIONAL_ID = 'national_id',
  MEDICAL_CLEARANCE = 'medical_clearance',
  INSURANCE = 'insurance',
  BIRTH_CERTIFICATE = 'birth_certificate',
  OTHER = 'other',
}

export enum SubmissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** fc_document_submissions */
@Entity('fc_document_submissions')
export class DocumentSubmission extends BaseEntity {
  @Index('idx_user_id')
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int', nullable: true })
  playerId: number | null;

  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player | null;

  @Index('idx_document_type')
  @Column({ name: 'document_type', type: 'enum', enum: SubmissionDocumentType })
  documentType: SubmissionDocumentType;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ name: 'stored_filename', type: 'varchar', length: 255 })
  storedFilename: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null;

  @Index('idx_status')
  @Column({
    name: 'status',
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;
}
