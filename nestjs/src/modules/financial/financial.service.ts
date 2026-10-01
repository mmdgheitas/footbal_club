import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ITEMS_PER_PAGE } from '../../config/constants';
import { insertedId, wasWritten } from '../../database/sql.helpers';

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

  async listFinancialItems(activeOnly = false): Promise<any[]> {
    return this.db.query(
      `SELECT * FROM fc_financial_items ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY name ASC`,
    );
  }

  async findFinancialItem(id: number): Promise<any | null> {
    const rows = await this.db.query('SELECT * FROM fc_financial_items WHERE id = ?', [id]);
    return rows[0] ?? null;
  }

  async saveFinancialItem(id: number | null, data: { name: string; price: number; quantity: number; isActive: boolean }): Promise<boolean> {
    if (id) {
      const result = await this.db.query(
        'UPDATE fc_financial_items SET name = ?, price = ?, quantity = ?, is_active = ? WHERE id = ?',
        [data.name, data.price, data.quantity, data.isActive ? 1 : 0, id],
      );
      return wasWritten(result);
    }
    const result = await this.db.query(
      'INSERT INTO fc_financial_items (name, price, quantity, is_active) VALUES (?, ?, ?, ?)',
      [data.name, data.price, data.quantity, data.isActive ? 1 : 0],
    );
    return Boolean(insertedId(result));
  }

  async deleteFinancialItem(id: number): Promise<boolean> {
    // Historical rows are retained through SET NULL and their snapshots remain intact.
    const result = await this.db.query('DELETE FROM fc_financial_items WHERE id = ?', [id]);
    return wasWritten(result);
  }

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
  async recordPayment(data: Record<string, any>, selectedItemIds: number[] = []): Promise<number | false> {
    const queryRunner = this.db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const uniqueIds = [...new Set(selectedItemIds.filter((id) => Number.isInteger(id) && id > 0))];
      let items: any[] = [];
      if (uniqueIds.length) {
        items = await queryRunner.query(
          `SELECT id, name, price, quantity FROM fc_financial_items WHERE is_active = 1 AND id IN (${uniqueIds.map(() => '?').join(',')})`,
          uniqueIds,
        );
        if (items.length !== uniqueIds.length) throw new Error('INVALID_FINANCIAL_ITEM');
      }
      const itemTotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
      const names = items.map((item) => String(item.name));
      const descriptionParts = [String(data.description ?? '').trim(), names.join('، ')].filter(Boolean);
      const row = {
        uuid: data.uuid ?? uuidv4(),
        ...data,
        amount: Number(data.amount) + itemTotal,
        description: [...new Set(descriptionParts)].join(' — '),
      };
      const cols = Object.keys(row);
      const result: any = await queryRunner.query(
        `INSERT INTO fc_payments (${cols.join(', ')})
         VALUES (${cols.map(() => '?').join(', ')})`,
        cols.map((c) => row[c]),
      );
      const paymentId = insertedId(result);

      if (!paymentId) {
        await queryRunner.rollbackTransaction();
        return false;
      }

      for (const item of items) {
        const lineTotal = Number(item.price) * Number(item.quantity);
        await queryRunner.query(
          `INSERT INTO fc_payment_items (payment_id, financial_item_id, item_name, unit_price, quantity, line_total)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [paymentId, item.id, item.name, item.price, item.quantity, lineTotal],
        );
      }

      await this.logTransaction(queryRunner, paymentId, row);

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
