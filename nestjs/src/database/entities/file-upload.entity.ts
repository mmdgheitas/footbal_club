import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';
import { User } from './user.entity';

export enum PlayerFileType {
  NATIONAL_ID = 'national_id',
  MEDICAL_CLEARANCE = 'medical_clearance',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

/** fc_file_uploads */
@Entity('fc_file_uploads')
export class FileUpload extends BaseEntity {
  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Index('idx_file_type')
  @Column({ name: 'file_type', type: 'enum', enum: PlayerFileType })
  fileType: PlayerFileType;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ name: 'stored_filename', type: 'varchar', length: 255 })
  storedFilename: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ name: 'uploaded_by', type: 'int', nullable: true })
  uploadedBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User | null;
}
