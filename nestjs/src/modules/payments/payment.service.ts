import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  Payment,
  PaymentStatus,
  PaymentTransaction,
  PaymentMode,
  TransactionLog,
  EntryType,
  PaymentTransactionStatus,
  PayerType,
  NotificationAudience,
  NotificationType,
} from '../../database/entities';
import {
  PAYMENT_CURRENCY_MULTIPLIER,
  PAYMENT_MIN_AMOUNT,
  PAYMENT_MODE,
  PAYMENT_TIMEOUT_SECONDS,
  CLUB_DISPLAY_NAME,
} from '../../config/constants';
import { addSeconds, fromSql, now, toSqlDateTime } from '../../common/helpers/time.helper';
import { NotificationService } from '../domain/notification.service';
import { GuardianService } from '../domain/guardian.service';
import { PaymentGatewayFactory } from './gateways/payment-gateway.factory';

export interface Payer {
  type: PayerType;
  id: number;
  /** Used for the gateway's optional mobile field. */
  phone?: string | null;
  name?: string | null;
}

export interface StartResult {
  ok: boolean;
  redirectUrl?: string;
  transactionId?: number;
  error?: string;
}

export interface SettleResult {
  ok: boolean;
  status: 'verified' | 'already_verified' | 'canceled' | 'failed' | 'unknown';
  transaction?: PaymentTransaction;
  payment?: Payment | null;
  error?: string;
}

export interface PayableInvoice {
  id: number;
  playerId: number;
  playerName: string;
  amount: number;
  description: string | null;
  dueDate: string | null;
  status: string;
  overdue: boolean;
  createdAt: string;
}

/**
 * پرداخت آنلاین — the money path.
 *
 * Rules that must never be relaxed:
 *
 *  1. **The amount comes from the invoice, never from the request.** A payer
 *     can only ever choose *which* invoice to pay.
 *  2. **Ownership is checked before anything else.** A guardian may only pay
 *     invoices of their own children (fc_player_guardians); a player only their
 *     own.
 *  3. **Only a successful verify credits the invoice**, inside one database
 *     transaction that also writes the double-entry rows — and only if the
 *     invoice is not already `completed`. A replayed callback is therefore
 *     harmless (`already_verified`).
 *  4. **Nothing is trusted from the callback but the token.** Status flags are
 *     recorded, then the gateway is asked directly.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger('PaymentService');

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(PaymentTransaction)
    private readonly transactions: Repository<PaymentTransaction>,
    private readonly gateways: PaymentGatewayFactory,
    private readonly notifications: NotificationService,
    private readonly guardians: GuardianService,
  ) {}

  // ------------------------------------------------------------------ reads

  /** Unpaid invoices of one player. */
  async payableForPlayer(playerId: number): Promise<PayableInvoice[]> {
    return this.payableFor([playerId]);
  }

  /** Unpaid invoices of every child of a guardian. */
  async payableForGuardian(guardianId: number): Promise<PayableInvoice[]> {
    const playerIds = await this.guardians.playerIdsOf(guardianId);
    return playerIds.length ? this.payableFor(playerIds) : [];
  }

  private async payableFor(playerIds: number[]): Promise<PayableInvoice[]> {
    const placeholders = playerIds.map(() => '?').join(', ');
    const rows = await this.db.query(
      `SELECT p.id, p.player_id, p.amount, p.description, p.due_date, p.status, p.created_at,
              pl.name AS player_name
       FROM fc_payments p
       JOIN fc_players pl ON pl.id = p.player_id
       WHERE p.player_id IN (${placeholders})
         AND p.deleted_at IS NULL
         AND p.status IN ('pending', 'failed')
       ORDER BY p.due_date IS NULL, p.due_date ASC, p.created_at ASC`,
      playerIds,
    );

    const today = toSqlDateTime().slice(0, 10);
    return (rows ?? []).map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      playerId: Number(r.player_id),
      playerName: String(r.player_name ?? ''),
      amount: Number(r.amount ?? 0),
      description: (r.description as string) ?? null,
      dueDate: r.due_date ? String(r.due_date).slice(0, 10) : null,
      status: String(r.status ?? 'pending'),
      overdue: r.due_date ? String(r.due_date).slice(0, 10) < today : false,
      createdAt: String(r.created_at ?? ''),
    }));
  }

  async findInvoice(paymentId: number): Promise<Payment | null> {
    return this.payments.findOne({ where: { id: paymentId } });
  }

  async findTransaction(id: number): Promise<PaymentTransaction | null> {
    return this.transactions.findOne({ where: { id } });
  }

  /** Attempts made against one invoice, newest first (receipt + support). */
  async transactionsOf(paymentId: number): Promise<PaymentTransaction[]> {
    return this.transactions.find({ where: { paymentId }, order: { id: 'DESC' } });
  }

  /** Recent attempts across the club — the admin transactions screen. */
  async recentTransactions(limit = 100): Promise<Record<string, unknown>[]> {
    return this.db.query(
      `SELECT t.*, p.player_id, pl.name AS player_name, p.description AS invoice_description
       FROM fc_payment_transactions t
       JOIN fc_payments p ON p.id = t.payment_id
       JOIN fc_players pl ON pl.id = p.player_id
       ORDER BY t.id DESC
       LIMIT ${Math.max(1, Math.min(500, limit))}`,
    );
  }

  /** May this payer settle this invoice? */
  async mayPay(payer: Payer, invoice: Payment): Promise<boolean> {
    if (payer.type === PayerType.ADMIN || payer.type === PayerType.SYSTEM) return true;
    if (payer.type === PayerType.PLAYER) return invoice.playerId === payer.id;
    if (payer.type === PayerType.GUARDIAN) return this.guardians.owns(payer.id, invoice.playerId);
    return false;
  }

  // ------------------------------------------------------------------ start

  /**
   * Opens an attempt and returns where to send the browser.
   * `baseUrl` is the public origin the gateway must call back to.
   */
  async start(paymentId: number, payer: Payer, baseUrl: string): Promise<StartResult> {
    const invoice = await this.findInvoice(paymentId);
    if (!invoice || invoice.deletedAt) {
      return { ok: false, error: 'صورتحساب یافت نشد.' };
    }
    if (!(await this.mayPay(payer, invoice))) {
      return { ok: false, error: 'این صورتحساب متعلق به شما نیست.' };
    }
    if (invoice.status === PaymentStatus.COMPLETED) {
      return { ok: false, error: 'این صورتحساب قبلاً پرداخت شده است.' };
    }

    const amount = Number(invoice.amount);
    if (!Number.isFinite(amount) || amount < PAYMENT_MIN_AMOUNT) {
      return {
        ok: false,
        error: `حداقل مبلغ قابل پرداخت آنلاین ${PAYMENT_MIN_AMOUNT} تومان است.`,
      };
    }

    const gateway = this.gateways.current();
    const gatewayAmount = Math.round(amount * PAYMENT_CURRENCY_MULTIPLIER);
    const reference = uuidv4();
    const description =
      invoice.description?.trim() || `${CLUB_DISPLAY_NAME} — صورتحساب شماره ${invoice.id}`;

    const transaction = await this.transactions.save(
      this.transactions.create({
        uuid: reference,
        paymentId: invoice.id,
        gateway: gateway.key,
        mode: (PAYMENT_MODE as PaymentMode) ?? PaymentMode.MOCK,
        amount: String(amount),
        gatewayAmount: String(gatewayAmount),
        status: PaymentTransactionStatus.INITIATED,
        payerType: payer.type,
        payerId: payer.id,
        description,
      }),
    );

    const callbackUrl = `${baseUrl.replace(/\/$/, '')}/payments/callback/${gateway.key}`;
    const result = await gateway.request({
      reference,
      amount,
      gatewayAmount,
      description,
      callbackUrl,
      mobile: payer.phone ?? null,
      metadata: { payment_id: invoice.id, player_id: invoice.playerId },
    });

    transaction.requestPayload = JSON.stringify({
      amount,
      gatewayAmount,
      callbackUrl,
      description,
    });
    transaction.responsePayload = PaymentService.stringify(result.raw);

    if (!result.ok || !result.redirectUrl) {
      transaction.status = PaymentTransactionStatus.FAILED;
      transaction.errorCode = result.errorCode ?? 'REQUEST_FAILED';
      transaction.errorMessage = (result.errorMessage ?? '').slice(0, 250) || 'خطای درگاه پرداخت';
      await this.transactions.save(transaction);
      this.logger.warn(`payment ${invoice.id}: gateway request failed (${transaction.errorCode})`);
      return { ok: false, error: transaction.errorMessage, transactionId: transaction.id };
    }

    transaction.authority = result.authority ?? null;
    transaction.status = PaymentTransactionStatus.PENDING;
    await this.transactions.save(transaction);

    return { ok: true, redirectUrl: result.redirectUrl, transactionId: transaction.id };
  }

  // --------------------------------------------------------------- callback

  /**
   * Handles the return from the gateway: look the attempt up by its token,
   * ask the gateway whether the money is real, and only then credit.
   */
  async settle(
    gatewayKey: string,
    query: Record<string, unknown>,
    body: Record<string, unknown>,
    ip: string | null,
  ): Promise<SettleResult> {
    const gateway = this.gateways.byKey(gatewayKey) ?? this.gateways.current();
    const callback = gateway.readCallback(query ?? {}, body ?? {});

    if (!callback.authority) {
      return { ok: false, status: 'unknown', error: 'پاسخ درگاه ناقص بود.' };
    }

    const transaction = await this.transactions.findOne({
      where: { gateway: gateway.key, authority: callback.authority },
    });
    if (!transaction) {
      return { ok: false, status: 'unknown', error: 'تراکنشی برای این پرداخت ثبت نشده است.' };
    }

    transaction.callbackIp = ip;

    // Replayed callback for an attempt that already credited the invoice.
    if (transaction.status === PaymentTransactionStatus.VERIFIED) {
      await this.transactions.save(transaction);
      return {
        ok: true,
        status: 'already_verified',
        transaction,
        payment: await this.findInvoice(transaction.paymentId),
      };
    }

    // The user pressed cancel on the bank page.
    if (!callback.succeeded) {
      transaction.status = PaymentTransactionStatus.CANCELED;
      transaction.errorCode = callback.status ?? 'CANCELED';
      transaction.errorMessage = 'پرداخت توسط کاربر لغو شد.';
      await this.transactions.save(transaction);
      return { ok: false, status: 'canceled', transaction, error: transaction.errorMessage };
    }

    // An attempt that sat unfinished for too long is not verified blindly.
    const startedAt = fromSql(transaction.createdAt) ?? now();
    if (addSeconds(startedAt, PAYMENT_TIMEOUT_SECONDS) < now()) {
      this.logger.warn(`transaction ${transaction.id}: callback arrived after the timeout window`);
    }

    transaction.status = PaymentTransactionStatus.PAID;
    await this.transactions.save(transaction);

    const verified = await gateway.verify({
      authority: callback.authority,
      amount: Number(transaction.amount),
      gatewayAmount: Number(transaction.gatewayAmount),
      callback: { ...body, ...query },
    });

    transaction.responsePayload = PaymentService.stringify(verified.raw);

    if (!verified.ok) {
      transaction.status = PaymentTransactionStatus.FAILED;
      transaction.errorCode = verified.errorCode ?? 'VERIFY_FAILED';
      transaction.errorMessage =
        (verified.errorMessage ?? '').slice(0, 250) || 'تأیید پرداخت ناموفق بود.';
      await this.transactions.save(transaction);
      return { ok: false, status: 'failed', transaction, error: transaction.errorMessage };
    }

    transaction.status = PaymentTransactionStatus.VERIFIED;
    transaction.refId = verified.refId ?? null;
    transaction.cardPan = verified.cardPan ?? null;
    transaction.errorCode = null;
    transaction.errorMessage = null;
    transaction.verifiedAt = toSqlDateTime();
    await this.transactions.save(transaction);

    const payment = await this.creditInvoice(transaction);
    await this.announce(transaction, payment);

    return {
      ok: true,
      status: verified.alreadyVerified ? 'already_verified' : 'verified',
      transaction,
      payment,
    };
  }

  /**
   * Marks the invoice paid and writes the double-entry rows, in one database
   * transaction. Skips silently when the invoice is already completed, so a
   * duplicated verify can never credit twice.
   */
  private async creditInvoice(transaction: PaymentTransaction): Promise<Payment | null> {
    const runner = this.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const rows = await runner.query(
        'SELECT id, amount, status, description FROM fc_payments WHERE id = ?',
        [transaction.paymentId],
      );
      const invoice = rows?.[0];
      if (!invoice) {
        await runner.rollbackTransaction();
        return null;
      }
      if (String(invoice.status) === PaymentStatus.COMPLETED) {
        await runner.commitTransaction();
        return this.findInvoice(transaction.paymentId);
      }

      // Written through the entity manager rather than raw SQL so the driver
      // owns the date conversion — the same rule the timezone contract sets
      // (common/helpers/time.helper.ts).
      await runner.manager.update(
        Payment,
        { id: transaction.paymentId },
        {
          status: PaymentStatus.COMPLETED,
          paymentMethod: `online:${transaction.gateway}`,
          referenceNumber: transaction.refId ?? transaction.authority,
          paidAt: toSqlDateTime(),
        },
      );

      // Same double entry the manual cash flow writes (FinancialService).
      const description =
        `پرداخت آنلاین — ${transaction.gateway} — ${transaction.refId ?? ''}`.trim();
      for (const entry of [
        { entryType: EntryType.CREDIT, accountCode: 'REVENUE-001' },
        { entryType: EntryType.DEBIT, accountCode: 'CASH-001' },
      ]) {
        await runner.manager.insert(TransactionLog, {
          uuid: uuidv4(),
          paymentId: transaction.paymentId,
          entryType: entry.entryType,
          amount: transaction.amount,
          accountCode: entry.accountCode,
          description,
        });
      }

      await runner.commitTransaction();
      return this.findInvoice(transaction.paymentId);
    } catch (error) {
      await runner.rollbackTransaction();
      this.logger.error(`crediting invoice ${transaction.paymentId} failed: ${(error as Error).message}`);
      return null;
    } finally {
      await runner.release();
    }
  }

  /** In-panel notifications for the payer, the guardian and the office. */
  private async announce(
    transaction: PaymentTransaction,
    payment: Payment | null,
  ): Promise<void> {
    if (!payment) return;

    const amount = Number(transaction.amount).toLocaleString('en-US');
    const title = 'پرداخت موفق';
    const message =
      `مبلغ ${amount} تومان بابت «${transaction.description ?? 'صورتحساب باشگاه'}» ` +
      `با کد پیگیری ${transaction.refId ?? transaction.authority ?? '-'} پرداخت شد.`;
    const link = `/payments/result/${transaction.id}`;

    await this.notifications.create({
      userType: NotificationAudience.PLAYER,
      userId: payment.playerId,
      title,
      message,
      type: NotificationType.DEBT,
      link,
      dedupeKey: `payment:player:${transaction.id}`,
    });

    const guardian = await this.guardians.guardianOfPlayer(payment.playerId);
    if (guardian) {
      await this.notifications.create({
        userType: NotificationAudience.GUARDIAN,
        userId: guardian.id,
        title,
        message,
        type: NotificationType.DEBT,
        link,
        dedupeKey: `payment:guardian:${transaction.id}`,
      });
    }

    // Retire debt reminders that the payment just made untrue.
    await this.clearSettledDebtAlerts(payment.playerId, guardian?.id ?? null);

    await this.notifications.notifyAdmins(await this.financeStaffIds(), {
      title: 'پرداخت آنلاین جدید',
      message,
      type: NotificationType.DEBT,
      link: '/admin/payments',
      dedupeKey: `payment:admin:${transaction.id}`,
    });
  }

  /** Ids of the staff accounts that handle money (for the office notification). */
  private async financeStaffIds(): Promise<number[]> {
    const rows = await this.db.query(
      `SELECT id FROM fc_users
       WHERE role IN ('super_admin', 'accountant') AND status = 1 AND deleted_at IS NULL`,
    );
    return (rows ?? []).map((r: { id: number }) => Number(r.id));
  }

  /**
   * Debt alerts are keyed `debt:p<playerId>:…` / `debt:g<guardianId>:…` by
   * DebtNotifierService. Once the family owes nothing, those alerts are removed
   * so the panel does not keep shouting about a settled bill.
   */
  private async clearSettledDebtAlerts(
    playerId: number,
    guardianId: number | null,
  ): Promise<void> {
    const [playerDebt] = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM fc_payments
       WHERE player_id = ? AND deleted_at IS NULL AND status IN ('pending', 'failed')`,
      [playerId],
    );
    if (Number(playerDebt?.total ?? 0) === 0) {
      await this.notifications.deleteByDedupePrefix(
        NotificationAudience.PLAYER,
        playerId,
        `debt:p${playerId}:`,
      );
    }

    if (!guardianId) return;

    const playerIds = await this.guardians.playerIdsOf(guardianId);
    if (playerIds.length === 0) return;
    const placeholders = playerIds.map(() => '?').join(', ');
    const [familyDebt] = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM fc_payments
       WHERE player_id IN (${placeholders}) AND deleted_at IS NULL
         AND status IN ('pending', 'failed')`,
      playerIds,
    );
    if (Number(familyDebt?.total ?? 0) === 0) {
      await this.notifications.deleteByDedupePrefix(
        NotificationAudience.GUARDIAN,
        guardianId,
        `debt:g${guardianId}:`,
      );
    }
  }

  // ---------------------------------------------------------------- invoices

  /** Issues an invoice (super admin / accountant), payable online right away. */
  async createInvoice(input: {
    playerId: number;
    amount: number;
    description?: string | null;
    dueDate?: string | null;
    createdBy?: number | null;
  }): Promise<Payment | null> {
    if (!input.playerId || !Number.isFinite(input.amount) || input.amount <= 0) return null;

    const invoice = await this.payments.save(
      this.payments.create({
        uuid: uuidv4(),
        playerId: input.playerId,
        amount: String(Math.round(input.amount)),
        description: input.description?.trim() || 'صورتحساب باشگاه',
        dueDate: input.dueDate || null,
        status: PaymentStatus.PENDING,
        createdBy: input.createdBy ?? null,
      }),
    );

    const amount = Number(invoice.amount).toLocaleString('en-US');
    const message =
      `صورتحساب جدید به مبلغ ${amount} تومان صادر شد` +
      (invoice.dueDate ? ` (مهلت پرداخت: ${invoice.dueDate}).` : '.');

    const guardian = await this.guardians.guardianOfPlayer(invoice.playerId);
    if (guardian) {
      await this.notifications.create({
        userType: NotificationAudience.GUARDIAN,
        userId: guardian.id,
        title: 'صورتحساب جدید',
        message,
        type: NotificationType.DEBT,
        link: '/guardian/financial',
        dedupeKey: `invoice:guardian:${invoice.id}`,
      });
    }
    await this.notifications.create({
      userType: NotificationAudience.PLAYER,
      userId: invoice.playerId,
      title: 'صورتحساب جدید',
      message,
      type: NotificationType.DEBT,
      link: '/app/profile',
      dedupeKey: `invoice:player:${invoice.id}`,
    });

    return invoice;
  }

  /** Cancels an unpaid invoice (soft delete, so the ledger keeps its history). */
  async cancelInvoice(paymentId: number): Promise<boolean> {
    const invoice = await this.findInvoice(paymentId);
    if (!invoice || invoice.status === PaymentStatus.COMPLETED) return false;
    await this.payments.update({ id: paymentId }, { deletedAt: new Date() });
    return true;
  }

  private static stringify(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    try {
      return JSON.stringify(value).slice(0, 60000);
    } catch {
      return null;
    }
  }
}
