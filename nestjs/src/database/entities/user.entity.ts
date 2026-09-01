import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COACH = 'coach',
  ACCOUNTANT = 'accountant',
  SECRETARY = 'secretary',
  PLAYER = 'player',
}

export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** fc_users */
@Entity('fc_users')
export class User extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Index('idx_email')
  @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'phone', type: 'varchar', length: 15, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Index('idx_role')
  @Column({ name: 'role', type: 'enum', enum: UserRole, default: UserRole.COACH })
  role: UserRole;

  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int', nullable: true })
  playerId: number | null;

  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player | null;

  @Index('idx_status')
  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Index('idx_document_status')
  @Column({
    name: 'document_status',
    type: 'enum',
    enum: DocumentStatus,
    nullable: true,
    default: null,
  })
  documentStatus: DocumentStatus | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  /** Self-referencing FK fk_users_approved_by */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'approved_by' })
  approver: User | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date | null;
}
