import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Player } from './player.entity';
import { TransactionLog } from './transaction-log.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/** fc_payments */
@Entity('fc_payments')
export class Payment extends BaseEntity {
  @Index('idx_player_id')
  @Column({ name: 'player_id', type: 'int' })
  playerId: number;

  @ManyToOne(() => Player, (p) => p.payments, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'amount', type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  @Index('idx_reference_number')
  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber: string | null;

  @Index('idx_status')
  @Column({
    name: 'status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ name: 'receipt_path', type: 'varchar', length: 500, nullable: true })
  receiptPath: string | null;

  @OneToMany(() => TransactionLog, (t) => t.payment)
  transactionLogs: TransactionLog[];
}
