import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FinancialItem } from './financial-item.entity';
import { Payment } from './payment.entity';

@Entity('fc_payment_items')
@Index('idx_payment_financial_item', ['paymentId', 'financialItemId'], { unique: true })
export class PaymentItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'payment_id', type: 'int' })
  paymentId: number;

  @Column({ name: 'financial_item_id', type: 'int', nullable: true })
  financialItemId: number | null;

  @Column({ name: 'item_name', type: 'varchar', length: 150 })
  itemName: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 15, scale: 2 })
  lineTotal: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Payment, (payment) => payment.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @ManyToOne(() => FinancialItem, (item) => item.paymentItems, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'financial_item_id' })
  financialItem: FinancialItem | null;
}
