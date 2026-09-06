import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ExpenseCategory {
  HALL = 'hall',
  GRASS = 'grass',
  OFFICE_RENT = 'office_rent',
  SALARY = 'salary',
  EQUIPMENT = 'equipment',
  TRANSPORT = 'transport',
  OTHER = 'other',
}

/**
 * fc_expenses — هزینه‌های باشگاه، همگی دستی توسط مدیر ارشد ثبت می‌شوند.
 * Feeds the profit / loss figures in the admin reports.
 */
@Entity('fc_expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'amount', type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Index('idx_category')
  @Column({
    name: 'category',
    type: 'enum',
    enum: ExpenseCategory,
    default: ExpenseCategory.OTHER,
  })
  category: ExpenseCategory;

  @Index('idx_expense_date')
  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: string;

  @Column({ name: 'recorded_by', type: 'int', nullable: true })
  recordedBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'recorded_by' })
  recorder: User | null;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
