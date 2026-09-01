import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

export enum EntryType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

/**
 * fc_transaction_logs — double-entry bookkeeping ledger.
 * Deviates from BaseEntity: uuid + created_at only (no updated_at/deleted_at).
 */
@Entity('fc_transaction_logs')
export class TransactionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'uuid', type: 'char', length: 36, unique: true })
  uuid: string;

  @Index('idx_payment_id')
  @Column({ name: 'payment_id', type: 'int', nullable: true })
  paymentId: number | null;

  @ManyToOne(() => Payment, (p) => p.transactionLogs, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment | null;

  @Index('idx_entry_type')
  @Column({ name: 'entry_type', type: 'enum', enum: EntryType })
  entryType: EntryType;

  @Column({ name: 'amount', type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ name: 'account_code', type: 'varchar', length: 50, nullable: true })
  accountCode: string | null;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
