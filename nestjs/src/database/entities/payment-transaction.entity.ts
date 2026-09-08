import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

/** Which environment the attempt ran against. */
export enum PaymentMode {
  MOCK = 'mock',
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
}

/**
 * Lifecycle of one attempt:
 *   initiated → pending (user sent to the gateway)
 *             → paid (gateway says paid, not verified yet)
 *             → verified (verify call succeeded — the only state that credits
 *               the invoice)
 *             → failed / canceled
 */
export enum PaymentTransactionStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  PAID = 'paid',
  VERIFIED = 'verified',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum PayerType {
  GUARDIAN = 'guardian',
  PLAYER = 'player',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

/**
 * fc_payment_transactions — one row per attempt at the payment gateway.
 *
 * fc_payments stays the invoice/ledger row; the back-and-forth with the gateway
 * (authority, ref id, raw payloads, failures) lives here, so an abandoned or
 * failed attempt never touches the invoice and a replayed callback cannot
 * credit it twice (`UNIQUE (gateway, authority)` plus the `verified` guard).
 */
@Entity('fc_payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'uuid', type: 'char', length: 36, unique: true })
  uuid: string;

  @Index('idx_payment_id')
  @Column({ name: 'payment_id', type: 'int' })
  paymentId: number;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ name: 'gateway', type: 'varchar', length: 30 })
  gateway: string;

  @Column({
    name: 'mode',
    type: 'enum',
    enum: PaymentMode,
    default: PaymentMode.MOCK,
  })
  mode: PaymentMode;

  /** Invoice amount in تومان, copied from fc_payments at start time. */
  @Column({ name: 'amount', type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  /** What was actually sent to the gateway (usually ریال). */
  @Column({ name: 'gateway_amount', type: 'bigint' })
  gatewayAmount: string;

  /** Gateway token / authority / trackId — whatever the driver calls it. */
  @Column({ name: 'authority', type: 'varchar', length: 255, nullable: true })
  authority: string | null;

  /** Bank reference shown on the receipt. */
  @Column({ name: 'ref_id', type: 'varchar', length: 100, nullable: true })
  refId: string | null;

  @Column({ name: 'card_pan', type: 'varchar', length: 30, nullable: true })
  cardPan: string | null;

  @Index('idx_status')
  @Column({
    name: 'status',
    type: 'enum',
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.INITIATED,
  })
  status: PaymentTransactionStatus;

  @Column({
    name: 'payer_type',
    type: 'enum',
    enum: PayerType,
    default: PayerType.GUARDIAN,
  })
  payerType: PayerType;

  @Column({ name: 'payer_id', type: 'int', nullable: true })
  payerId: number | null;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'error_code', type: 'varchar', length: 50, nullable: true })
  errorCode: string | null;

  @Column({ name: 'error_message', type: 'varchar', length: 255, nullable: true })
  errorMessage: string | null;

  @Column({ name: 'request_payload', type: 'text', nullable: true })
  requestPayload: string | null;

  @Column({ name: 'response_payload', type: 'text', nullable: true })
  responsePayload: string | null;

  @Column({ name: 'callback_ip', type: 'varchar', length: 45, nullable: true })
  callbackIp: string | null;

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
