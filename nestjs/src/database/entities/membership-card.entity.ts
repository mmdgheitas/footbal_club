import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Player } from './player.entity';

export enum MembershipCardStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

/**
 * fc_membership_cards — کارت عضویت دیجیتال (۸×۱۱ سانتی‌متر).
 *
 * Issued automatically the moment a registration is approved
 * (RegistrationService.approve → MembershipCardService.issueFor).
 */
@Entity('fc_membership_cards')
export class MembershipCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  /** Human readable card number, e.g. NVB-1404-000123 */
  @Index('idx_card_number')
  @Column({ name: 'card_number', type: 'varchar', length: 50, unique: true })
  cardNumber: string;

  @Column({ name: 'issued_at', type: 'datetime' })
  issuedAt: string;

  /** Filled in only when a PDF has actually been rendered to disk. */
  @Column({ name: 'pdf_path', type: 'varchar', length: 500, nullable: true })
  pdfPath: string | null;

  @Index('idx_status')
  @Column({
    name: 'status',
    type: 'enum',
    enum: MembershipCardStatus,
    default: MembershipCardStatus.ACTIVE,
  })
  status: MembershipCardStatus;

  @Column({ name: 'issued_by', type: 'int', nullable: true })
  issuedBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
