import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Expense, ExpenseCategory } from '../../database/entities';
import { yearMonth } from '../../database/sql.helpers';
import { EXPENSE_CATEGORIES } from '../../config/constants';

export interface ExpenseTotals {
  total: number;
  byCategory: Array<{ category: string; label: string; total: number; count: number }>;
  byMonth: Array<{ month: string; total: number }>;
}

/**
 * هزینه‌های باشگاه — recorded by hand by the super admin (سالن، چمن، اجاره دفتر،
 * حقوق و ...). There is no automatic expense source anywhere in the system, as
 * required by the brief.
 */
@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense) private readonly repo: Repository<Expense>,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  list(filters: { from?: string; to?: string; category?: string } = {}): Promise<Expense[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.recorder', 'u')
      .where('e.deletedAt IS NULL')
      .orderBy('e.expenseDate', 'DESC')
      .addOrderBy('e.id', 'DESC');

    if (filters.from) qb.andWhere('e.expenseDate >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('e.expenseDate <= :to', { to: filters.to });
    if (filters.category) qb.andWhere('e.category = :category', { category: filters.category });

    return qb.getMany();
  }

  find(id: number): Promise<Expense | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: {
    title: string;
    amount: number;
    category: string;
    expenseDate: string;
    note?: string | null;
    recordedBy: number | null;
  }): Promise<Expense> {
    return this.repo.save(
      this.repo.create({
        title: data.title,
        amount: String(data.amount),
        category: data.category as ExpenseCategory,
        expenseDate: data.expenseDate,
        note: data.note ?? null,
        recordedBy: data.recordedBy,
      }),
    );
  }

  async update(
    id: number,
    data: {
      title?: string;
      amount?: number;
      category?: string;
      expenseDate?: string;
      note?: string | null;
    },
  ): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.amount !== undefined) patch.amount = String(data.amount);
    if (data.category !== undefined) patch.category = data.category;
    if (data.expenseDate !== undefined) patch.expenseDate = data.expenseDate;
    if (data.note !== undefined) patch.note = data.note;
    await this.repo.update({ id }, patch);
  }

  async remove(id: number): Promise<void> {
    await this.repo.softDelete({ id });
  }

  /** Totals for the admin report: overall, per category and per month. */
  async totals(from?: string, to?: string): Promise<ExpenseTotals> {
    const params: unknown[] = [];
    let where = 'e.deleted_at IS NULL';
    if (from) {
      where += ' AND e.expense_date >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND e.expense_date <= ?';
      params.push(to);
    }

    const totalRows = await this.db.query(
      `SELECT COALESCE(SUM(e.amount), 0) AS total FROM fc_expenses e WHERE ${where}`,
      params,
    );

    const categoryRows = await this.db.query(
      `SELECT e.category AS category, COALESCE(SUM(e.amount), 0) AS total, COUNT(e.id) AS count
       FROM fc_expenses e WHERE ${where}
       GROUP BY e.category ORDER BY total DESC`,
      params,
    );

    const monthRows = await this.db.query(
      `SELECT ${yearMonth('e.expense_date')} AS month, COALESCE(SUM(e.amount), 0) AS total
       FROM fc_expenses e WHERE ${where}
       GROUP BY month ORDER BY month ASC`,
      params,
    );

    return {
      total: Number(totalRows?.[0]?.total ?? 0),
      byCategory: (categoryRows ?? []).map((r: any) => ({
        category: r.category,
        label: EXPENSE_CATEGORIES[r.category] ?? r.category,
        total: Number(r.total ?? 0),
        count: Number(r.count ?? 0),
      })),
      byMonth: (monthRows ?? []).map((r: any) => ({
        month: r.month,
        total: Number(r.total ?? 0),
      })),
    };
  }
}
