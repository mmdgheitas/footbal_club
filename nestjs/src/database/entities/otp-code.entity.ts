import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * fc_otp_codes — کدهای یک‌بارمصرف ورود.
 *
 * Codes are 6 digits, valid for 5 minutes, single use, and rate limited per
 * phone number (see OtpService).
 */
@Entity('fc_otp_codes')
export class OtpCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_phone')
  @Column({ name: 'phone', type: 'varchar', length: 15 })
  phone: string;

  /** Stored as a SHA-256 hash — a leaked table must not hand out logins. */
  @Column({ name: 'code', type: 'varchar', length: 128 })
  code: string;

  @Index('idx_expires_at')
  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: string;

  @Column({ name: 'used', type: 'tinyint', width: 1, default: 0 })
  used: number;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
