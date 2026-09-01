import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ITEMS_PER_PAGE } from '../../config/constants';

/**
 * Port of app/Models/Payment.php::{recordPayment,logTransaction}() and the
 * inline payment queries in FinancialController.
 *
 * The yearly-revenue and debts queries live in DashboardService (already
 * ported verbatim) and are reused rather than duplicated.
 */
@Injectable()
export class FinancialService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** FinancialController::index() paginated payment list. */
  async listPayments(page: number): Promise<any[]> {
    const offset = (page - 1) * ITEMS_PER_PAGE;
    return this.db.query(
      `SELECT p.*, pl.name as player_name FROM fc_payments p
       LEFT JOIN fc_players pl ON p.player_id = pl.id
       WHERE p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT ?, ?`,
      [offset, ITEMS_PER_PAGE],
    );
  }

  /** The player picker on the record-payment form. */
  async listSelectablePlayers(): Promise<any[]> {
    return this.db.query(
      `SELECT id, name FROM fc_players
       WHERE status = 1 AND deleted_at IS NULL ORDER BY name ASC`,
    );
  }

  /** FinancialController::generateReceipt() lookup. */
  async findPaymentWithPlayer(paymentId: number): Promise<any | null> {
    const rows = await this.db.query(
      `SELECT p.*, pl.name as player_name, pl.national_id FROM fc_payments p
       LEFT JOIN fc_players pl ON p.player_id = pl.id
       WHERE p.id = ?`,
      [paymentId],
    );
    return rows[0] ?? null;
  }

  /**
   * Payment::recordPayment() - inserts the payment and writes the
   * double-entry transaction log inside one transaction.
   */
  async recordPayment(data: Record<string, any>): Promise<number | false> {
    const queryRunner = this.db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const row = { uuid: data.uuid ?? uuidv4(), ...data };
      const cols = Object.keys(row);
      const result: any = await queryRunner.query(
        `INSERT INTO fc_payments (${cols.join(', ')})
         VALUES (${cols.map(() => '?').join(', ')})`,
        cols.map((c) => row[c]),
      );
      const paymentId = result?.insertId;

      if (!paymentId) {
        await queryRunner.rollbackTransaction();
        return false;
      }

      await this.logTransaction(queryRunner, paymentId, data);

      await queryRunner.commitTransaction();
      return paymentId;
    } catch {
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      await queryRunner.release();
    }
  }

  /** Payment::logTransaction() - credit always, debit when completed. */
  private async logTransaction(
    runner: any,
    paymentId: number,
    data: Record<string, any>,
  ): Promise<void> {
    const insert = (entry: Record<string, any>) => {
      const cols = Object.keys(entry);
      return runner.query(
        `INSERT INTO fc_transaction_logs (${cols.join(', ')})
         VALUES (${cols.map(() => '?').join(', ')})`,
        cols.map((c) => entry[c]),
      );
    };

    // Credit entry
    await insert({
      uuid: uuidv4(),
      payment_id: paymentId,
      entry_type: 'credit',
      amount: data.amount,
      account_code: 'REVENUE-001',
      description: data.description ?? 'Payment received',
    });

    // Debit entry (if applicable)
    if (data.status === 'completed') {
      await insert({
        uuid: uuidv4(),
        payment_id: paymentId,
        entry_type: 'debit',
        amount: data.amount,
        account_code: 'BANK-001',
        description: 'Deposit to bank',
      });
    }
  }
}
