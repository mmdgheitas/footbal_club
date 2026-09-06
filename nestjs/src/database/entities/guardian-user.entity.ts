import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerGuardian } from './player-guardian.entity';

/**
 * fc_guardians_users — حساب کاربری ولی.
 *
 * Deliberately separate from `fc_guardians` (which is a per-player contact
 * record on the player's file) and from `fc_users` (staff accounts): a guardian
 * signs in with their own phone number and may have several children.
 */
@Entity('fc_guardians_users')
export class GuardianUser extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Index('idx_phone')
  @Column({ name: 'phone', type: 'varchar', length: 15, unique: true })
  phone: string;

  @Column({ name: 'national_id', type: 'varchar', length: 50, nullable: true })
  nationalId: string | null;

  /** Optional — the panel is OTP-first, a password is never required. */
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  passwordHash: string | null;

  @Index('idx_status')
  @Column({ name: 'status', type: 'tinyint', width: 1, default: 1 })
  status: number;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date | null;

  @OneToMany(() => PlayerGuardian, (link) => link.guardian)
  links: PlayerGuardian[];
}
