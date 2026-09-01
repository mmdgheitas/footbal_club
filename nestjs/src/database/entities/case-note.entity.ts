import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';
import { User } from './user.entity';

export enum CaseNoteType {
  GENERAL = 'general',
  MEDICAL = 'medical',
  DISCIPLINARY = 'disciplinary',
  ACHIEVEMENT = 'achievement',
  CONCERN = 'concern',
}

export enum CaseNoteSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/** fc_case_notes */
@Entity('fc_case_notes')
export class CaseNote extends BaseEntity {
  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Index('idx_user_id')
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Index('idx_note_type')
  @Column({
    name: 'note_type',
    type: 'enum',
    enum: CaseNoteType,
    default: CaseNoteType.GENERAL,
  })
  noteType: CaseNoteType;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({
    name: 'severity',
    type: 'enum',
    enum: CaseNoteSeverity,
    default: CaseNoteSeverity.LOW,
  })
  severity: CaseNoteSeverity;

  @Index('idx_created_by')
  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @Column({ name: 'is_visible_to_player', type: 'tinyint', width: 1, default: 0 })
  isVisibleToPlayer: number;
}
