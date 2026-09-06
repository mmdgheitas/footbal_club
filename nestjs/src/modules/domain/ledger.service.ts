import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { yearMonth } from '../../database/sql.helpers';
import { ExpenseService } from './expense.service';

export interface LedgerEntry {
  date: string;
  kind: 'payment' | 'debt' | 'discount';
  title: string;
  amount: number;
  status: string;
  statusLabel: string;
  reference: string | null;
  method: string | null;
}

export interface PlayerLedger {
  playerId: number;
  playerName: string;
  entries: LedgerEntry[];
  totalPaid: number;
  totalOutstanding: number;
  totalDiscount: number;
  balance: number;
  hasDebt: boolean;
}

/**
 * دفترچه مالی شفاف — every payment, debt and discount of a player in one
 * chronological list, plus the aggregates the guardian panel and the admin
 * reports need.
 *
 * All SQL here is dialect-neutral (see database/sql.helpers.ts for the two
 * expressions that are not).
 */
@Injectable()
export class LedgerService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly expenses: ExpenseService,
  ) {}

  // --------------------------------------------------------------- player

  async playerLedger(playerId: number): Promise<PlayerLedger> {
    const playerRows = await this.db.query(
      'SELECT id, name FROM fc_players WHERE id = ?',
      [playerId],
    );
    const player = playerRows?.[0] ?? { id: playerId, name: '' };

    const payments = await this.db.query(
      `SELECT id, amount, description, payment_method, reference_number, status, created_at
       FROM fc_payments
       WHERE player_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [playerId],
    );

    const discounts = await this.db.query(
      `SELECT id, name, amount, percentage, reason, valid_from, created_at
       FROM fc_discounts
       WHERE player_id = ? AND status = 1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [playerId],
    );

    const statusLabels: Record<string, string> = {
      completed: 'پرداخت شده',
      pending: 'در انتظار پرداخت',
      failed: 'ناموفق',
      refunded: 'بازپرداخت شده',
    };

    const entries: LedgerEntry[] = [];
    let totalPaid = 0;
    let totalOutstanding = 0;

    for (const p of payments ?? []) {
      const amount = Number(p.amount ?? 0);
      const status = String(p.status);
      if (status === 'completed') totalPaid += amount;
      if (status === 'pending' || status === 'failed') totalOutstanding += amount;

      entries.push({
        date: String(p.created_at ?? '').slice(0, 10),
        kind: status === 'completed' ? 'payment' : 'debt',
        title: p.description || 'شهریه',
        amount,
        status,
        statusLabel: statusLabels[status] ?? status,
        reference: p.reference_number ?? null,
        method: p.payment_method ?? null,
      });
    }

    let totalDiscount = 0;
    for (const d of discounts ?? []) {
      const amount = Number(d.amount ?? 0);
      totalDiscount += amount;
      entries.push({
        date: String(d.valid_from ?? d.created_at ?? '').slice(0, 10),
        kind: 'discount',
        title: `${d.name}${d.percentage ? ` (${d.percentage}٪)` : ''}`,
        amount,
        status: 'discount',
        statusLabel: 'تخفیف',
        reference: d.reason ?? null,
        method: null,
      });
    }

    entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return {
      playerId,
      playerName: player.name ?? '',
      entries,
      totalPaid,
      totalOutstanding,
      totalDiscount,
      balance: totalPaid - totalOutstanding,
      hasDebt: totalOutstanding > 0,
    };
  }

  /** Ledger of every child of a guardian, plus the family totals. */
  async guardianLedger(playerIds: number[]): Promise<{
    ledgers: PlayerLedger[];
    totalPaid: number;
    totalOutstanding: number;
    totalDiscount: number;
  }> {
    const ledgers: PlayerLedger[] = [];
    for (const id of playerIds) {
      ledgers.push(await this.playerLedger(id));
    }
    return {
      ledgers,
      totalPaid: ledgers.reduce((s, l) => s + l.totalPaid, 0),
      totalOutstanding: ledgers.reduce((s, l) => s + l.totalOutstanding, 0),
      totalDiscount: ledgers.reduce((s, l) => s + l.totalDiscount, 0),
    };
  }

  async outstandingFor(playerId: number): Promise<number> {
    const rows = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM fc_payments
       WHERE player_id = ? AND status IN ('pending','failed') AND deleted_at IS NULL`,
      [playerId],
    );
    return Number(rows?.[0]?.total ?? 0);
  }

  // ---------------------------------------------------------------- admin

  /** بدهکاران — every player with an outstanding balance. */
  async debtors(): Promise<
    Array<{
      player_id: number;
      player_name: string;
      classroom_name: string | null;
      guardian_name: string | null;
      guardian_phone: string | null;
      guardian_id: number | null;
      total_debt: number;
      items: number;
    }>
  > {
    const rows = await this.db.query(
      `SELECT p.id            AS player_id,
              p.name          AS player_name,
              c.name          AS classroom_name,
              gu.name         AS guardian_name,
              gu.phone        AS guardian_phone,
              gu.id           AS guardian_id,
              COALESCE(SUM(pay.amount), 0) AS total_debt,
              COUNT(pay.id)   AS items
       FROM fc_players p
       LEFT JOIN fc_classrooms c        ON c.id = p.classroom_id
       LEFT JOIN fc_player_guardians pg ON pg.player_id = p.id
       LEFT JOIN fc_guardians_users gu  ON gu.id = pg.guardian_id
       JOIN fc_payments pay             ON pay.player_id = p.id
                                        AND pay.status IN ('pending','failed')
                                        AND pay.deleted_at IS NULL
       WHERE p.deleted_at IS NULL
       GROUP BY p.id, p.name, c.name, gu.name, gu.phone, gu.id
       ORDER BY total_debt DESC`,
    );

    return (rows ?? []).map((r: any) => ({
      player_id: Number(r.player_id),
      player_name: r.player_name,
      classroom_name: r.classroom_name ?? null,
      guardian_name: r.guardian_name ?? null,
      guardian_phone: r.guardian_phone ?? null,
      guardian_id: r.guardian_id === null ? null : Number(r.guardian_id),
      total_debt: Number(r.total_debt ?? 0),
      items: Number(r.items ?? 0),
    }));
  }

  /** درآمد ماهانه — completed payments grouped by month. */
  async incomeByMonth(months = 12): Promise<Array<{ month: string; total: number }>> {
    const rows = await this.db.query(
      `SELECT ${yearMonth('created_at')} AS month, COALESCE(SUM(amount), 0) AS total
       FROM fc_payments
       WHERE status = 'completed' AND deleted_at IS NULL
       GROUP BY month
       ORDER BY month DESC`,
    );
    return (rows ?? [])
      .slice(0, months)
      .map((r: any) => ({ month: r.month, total: Number(r.total ?? 0) }))
      .reverse();
  }

  /** درآمد سه‌ماهه — quarters built from the monthly buckets. */
  async incomeByQuarter(): Promise<Array<{ quarter: string; total: number }>> {
    const monthly = await this.incomeByMonth(48);
    const buckets = new Map<string, number>();
    for (const row of monthly) {
      const [y, m] = row.month.split('-').map((v) => parseInt(v, 10));
      const quarter = `${y}-Q${Math.ceil(m / 3)}`;
      buckets.set(quarter, (buckets.get(quarter) ?? 0) + row.total);
    }
    return [...buckets.entries()]
      .map(([quarter, total]) => ({ quarter, total }))
      .sort((a, b) => (a.quarter < b.quarter ? -1 : 1));
  }

  async totalIncome(from?: string, to?: string): Promise<number> {
    const params: unknown[] = [];
    let where = "status = 'completed' AND deleted_at IS NULL";
    if (from) {
      where += ' AND created_at >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND created_at <= ?';
      params.push(`${to} 23:59:59`);
    }
    const rows = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM fc_payments WHERE ${where}`,
      params,
    );
    return Number(rows?.[0]?.total ?? 0);
  }

  async totalOutstanding(): Promise<number> {
    const rows = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM fc_payments
       WHERE status IN ('pending','failed') AND deleted_at IS NULL`,
    );
    return Number(rows?.[0]?.total ?? 0);
  }

  /**
   * سود/زیان تقریبی — approximate profit: collected income minus manually
   * recorded expenses over the same window.
   */
  async profitAndLoss(
    from?: string,
    to?: string,
  ): Promise<{
    income: number;
    expenses: number;
    profit: number;
    margin: number;
    byMonth: Array<{ month: string; income: number; expense: number; profit: number }>;
  }> {
    const [income, expenseTotals, incomeMonths] = await Promise.all([
      this.totalIncome(from, to),
      this.expenses.totals(from, to),
      this.incomeByMonth(24),
    ]);

    const expenseMap = new Map(expenseTotals.byMonth.map((r) => [r.month, r.total]));
    const months = new Set<string>([
      ...incomeMonths.map((r) => r.month),
      ...expenseTotals.byMonth.map((r) => r.month),
    ]);

    const byMonth = [...months]
      .sort()
      .map((month) => {
        const monthIncome = incomeMonths.find((r) => r.month === month)?.total ?? 0;
        const monthExpense = expenseMap.get(month) ?? 0;
        return {
          month,
          income: monthIncome,
          expense: monthExpense,
          profit: monthIncome - monthExpense,
        };
      });

    const profit = income - expenseTotals.total;
    return {
      income,
      expenses: expenseTotals.total,
      profit,
      margin: income > 0 ? Math.round((profit / income) * 100) : 0,
      byMonth,
    };
  }
}
