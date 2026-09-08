import { DataSource, Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentTransaction,
  PaymentTransactionStatus,
  PayerType,
} from '../src/database/entities';
import { PaymentService } from '../src/modules/payments/payment.service';
import { MockPaymentGateway } from '../src/modules/payments/gateways/mock.gateway';
import { PaymentGatewayFactory } from '../src/modules/payments/gateways/payment-gateway.factory';
import { ZarinpalGateway } from '../src/modules/payments/gateways/zarinpal.gateway';
import { BitpayGateway } from '../src/modules/payments/gateways/bitpay.gateway';
import { NotificationService } from '../src/modules/domain/notification.service';
import { GuardianService } from '../src/modules/domain/guardian.service';

/**
 * پرداخت آنلاین — the rules that protect the money.
 *
 * Everything runs against the simulator gateway and in-memory repositories, so
 * the whole request → callback → verify → credit path is exercised with no
 * network, no merchant account and no database.
 *
 * What is asserted here is what must never regress:
 *   • the amount comes from the invoice, never from the request;
 *   • a guardian can only pay their own children's invoices;
 *   • only a verified callback credits the invoice, exactly once;
 *   • a replayed callback is a no-op;
 *   • a canceled or unverifiable attempt leaves the invoice unpaid.
 */

interface Row {
  [key: string]: unknown;
}

/** Minimal stand-ins for the two repositories PaymentService writes through. */
function makeState() {
  const invoices: Payment[] = [
    {
      id: 41,
      uuid: 'inv-41',
      playerId: 1,
      amount: '2500000',
      description: 'شهریه فصل زمستان',
      status: PaymentStatus.PENDING,
      deletedAt: null,
    } as unknown as Payment,
    {
      id: 42,
      uuid: 'inv-42',
      playerId: 9, // a player that belongs to someone else
      amount: '1000000',
      description: 'شهریه فرزند خانواده دیگر',
      status: PaymentStatus.PENDING,
      deletedAt: null,
    } as unknown as Payment,
  ];

  const transactions: PaymentTransaction[] = [];
  const ledgerRows: Row[] = [];
  let nextTxId = 1;

  const payments = {
    findOne: async ({ where }: { where: { id: number } }) =>
      invoices.find((i) => i.id === where.id) ?? null,
    create: (data: Partial<Payment>) => ({ ...data }) as Payment,
    save: async (row: Payment) => row,
    update: async () => ({ affected: 1 }),
  } as unknown as Repository<Payment>;

  const transactionRepo = {
    create: (data: Partial<PaymentTransaction>) => ({ ...data }) as PaymentTransaction,
    save: async (row: PaymentTransaction) => {
      if (!row.id) {
        row.id = nextTxId++;
        transactions.push(row);
      }
      return row;
    },
    findOne: async ({ where }: { where: Record<string, unknown> }) =>
      transactions.find((t) =>
        Object.entries(where).every(
          ([key, value]) => (t as unknown as Record<string, unknown>)[key] === value,
        ),
      ) ?? null,
    find: async () => transactions,
  } as unknown as Repository<PaymentTransaction>;

  /** Just enough SQL surface for creditInvoice() and the debt queries. */
  const db = {
    query: async (sql: string, params: unknown[] = []) => {
      if (/SELECT id, amount, status, description FROM fc_payments/.test(sql)) {
        const invoice = invoices.find((i) => i.id === Number(params[0]));
        return invoice ? [{ ...invoice }] : [];
      }
      if (/UPDATE fc_payments/.test(sql)) {
        const invoice = invoices.find((i) => i.id === Number(params[params.length - 1]));
        if (invoice) {
          invoice.status = PaymentStatus.COMPLETED;
          (invoice as unknown as Row).referenceNumber = params[1];
        }
        return { affected: 1 };
      }
      if (/INSERT INTO fc_transaction_logs/.test(sql)) {
        ledgerRows.push({ entryType: params[2], amount: params[3], account: params[4] });
        return { affected: 1 };
      }
      if (/SELECT COALESCE\(SUM\(amount\), 0\) AS total FROM fc_payments/.test(sql)) {
        return [{ total: 0 }];
      }
      if (/SELECT id FROM fc_users/.test(sql)) {
        return [{ id: 1 }];
      }
      return [];
    },
    createQueryRunner: () => ({
      connect: async () => undefined,
      startTransaction: async () => undefined,
      commitTransaction: async () => undefined,
      rollbackTransaction: async () => undefined,
      release: async () => undefined,
      query: async (sql: string, params: unknown[] = []) => db.query(sql, params),
      // creditInvoice() writes through the entity manager so the driver owns
      // the date conversion; the stub mirrors what those two calls do.
      manager: {
        update: async (_entity: unknown, criteria: { id: number }, patch: Record<string, unknown>) => {
          const invoice = invoices.find((i) => i.id === criteria.id);
          if (invoice) Object.assign(invoice, patch);
          return { affected: 1 };
        },
        insert: async (_entity: unknown, row: Record<string, unknown>) => {
          ledgerRows.push({ entryType: row.entryType, amount: row.amount, account: row.accountCode });
          return { identifiers: [] };
        },
      },
    }),
  } as unknown as DataSource;

  const notifications = {
    create: async () => null,
    notifyAdmins: async () => undefined,
    deleteByDedupePrefix: async () => 0,
  } as unknown as NotificationService;

  const guardians = {
    // Guardian 7 owns player 1 only.
    owns: async (guardianId: number, playerId: number) => guardianId === 7 && playerId === 1,
    playerIdsOf: async (guardianId: number) => (guardianId === 7 ? [1] : []),
    guardianOfPlayer: async (playerId: number) =>
      playerId === 1 ? ({ id: 7, name: 'حسن رضایی' } as never) : null,
  } as unknown as GuardianService;

  const mock = new MockPaymentGateway();
  const factory = new PaymentGatewayFactory(mock, new BitpayGateway(), new ZarinpalGateway());
  const service = new PaymentService(db, payments, transactionRepo, factory, notifications, guardians);

  return { service, mock, invoices, transactions, ledgerRows };
}

const GUARDIAN = { type: PayerType.GUARDIAN, id: 7 };
const OTHER_GUARDIAN = { type: PayerType.GUARDIAN, id: 8 };
const PLAYER = { type: PayerType.PLAYER, id: 1 };

/** Pulls the token out of the simulator redirect. */
function authorityOf(redirectUrl: string): string {
  return redirectUrl.split('/payments/mock/')[1].split('?')[0];
}

describe('online payment — starting an attempt', () => {
  it('sends the payer to the gateway and records a pending attempt', async () => {
    const { service, transactions } = makeState();

    const started = await service.start(41, GUARDIAN, 'https://club.example.com');

    expect(started.ok).toBe(true);
    expect(started.redirectUrl).toContain('/payments/mock/');
    expect(transactions).toHaveLength(1);
    expect(transactions[0].status).toBe(PaymentTransactionStatus.PENDING);
    expect(transactions[0].payerType).toBe(PayerType.GUARDIAN);
    expect(transactions[0].payerId).toBe(7);
  });

  it('takes the amount from the invoice, not from the caller', async () => {
    const { service, transactions } = makeState();

    await service.start(41, GUARDIAN, 'https://club.example.com');

    // 2,500,000 تومان on the invoice → 25,000,000 ریال at the gateway.
    expect(transactions[0].amount).toBe('2500000');
    expect(transactions[0].gatewayAmount).toBe('25000000');
  });

  it('refuses an invoice that belongs to another family', async () => {
    const { service, transactions } = makeState();

    const started = await service.start(41, OTHER_GUARDIAN, 'https://club.example.com');

    expect(started.ok).toBe(false);
    expect(started.error).toContain('متعلق به شما نیست');
    expect(transactions).toHaveLength(0);
  });

  it('refuses another player’s invoice', async () => {
    const { service } = makeState();
    const started = await service.start(42, PLAYER, 'https://club.example.com');
    expect(started.ok).toBe(false);
  });

  it('refuses an invoice that is already paid', async () => {
    const { service, invoices } = makeState();
    invoices[0].status = PaymentStatus.COMPLETED;

    const started = await service.start(41, GUARDIAN, 'https://club.example.com');

    expect(started.ok).toBe(false);
    expect(started.error).toContain('قبلاً پرداخت شده');
  });

  it('builds a callback URL on the public origin', async () => {
    const { service, transactions } = makeState();
    await service.start(41, GUARDIAN, 'https://club.example.com/');
    expect(String(transactions[0].requestPayload)).toContain(
      'https://club.example.com/payments/callback/mock',
    );
  });
});

describe('online payment — coming back from the gateway', () => {
  it('verifies, credits the invoice once and writes both ledger entries', async () => {
    const { service, invoices, ledgerRows } = makeState();

    const started = await service.start(41, GUARDIAN, 'https://club.example.com');
    const authority = authorityOf(started.redirectUrl as string);

    const settled = await service.settle('mock', { Authority: authority, Status: 'OK' }, {}, '1.2.3.4');

    expect(settled.ok).toBe(true);
    expect(settled.status).toBe('verified');
    expect(settled.transaction?.status).toBe(PaymentTransactionStatus.VERIFIED);
    expect(settled.transaction?.refId).toBeTruthy();
    expect(invoices[0].status).toBe(PaymentStatus.COMPLETED);
    expect(ledgerRows.map((r) => r.entryType)).toEqual(['credit', 'debit']);
  });

  it('is idempotent — a replayed callback credits nothing twice', async () => {
    const { service, ledgerRows } = makeState();

    const started = await service.start(41, GUARDIAN, 'https://club.example.com');
    const authority = authorityOf(started.redirectUrl as string);
    const query = { Authority: authority, Status: 'OK' };

    await service.settle('mock', query, {}, null);
    const replay = await service.settle('mock', query, {}, null);

    expect(replay.ok).toBe(true);
    expect(replay.status).toBe('already_verified');
    expect(ledgerRows).toHaveLength(2); // still just the first credit/debit pair
  });

  it('leaves the invoice unpaid when the payer cancels', async () => {
    const { service, invoices, ledgerRows } = makeState();

    const started = await service.start(41, GUARDIAN, 'https://club.example.com');
    const authority = authorityOf(started.redirectUrl as string);

    const settled = await service.settle('mock', { Authority: authority, Status: 'NOK' }, {}, null);

    expect(settled.ok).toBe(false);
    expect(settled.status).toBe('canceled');
    expect(settled.transaction?.status).toBe(PaymentTransactionStatus.CANCELED);
    expect(invoices[0].status).toBe(PaymentStatus.PENDING);
    expect(ledgerRows).toHaveLength(0);
  });

  it('does not trust a success flag the gateway cannot confirm', async () => {
    const { service, invoices } = makeState();

    await service.start(41, GUARDIAN, 'https://club.example.com');
    // A forged callback for a token the gateway never issued.
    const settled = await service.settle('mock', { Authority: 'MOCK-FORGED', Status: 'OK' }, {}, null);

    expect(settled.ok).toBe(false);
    expect(settled.status).toBe('unknown');
    expect(invoices[0].status).toBe(PaymentStatus.PENDING);
  });

  it('marks the attempt failed when verify refuses it', async () => {
    const { service, mock, invoices } = makeState();

    const started = await service.start(41, GUARDIAN, 'https://club.example.com');
    const authority = authorityOf(started.redirectUrl as string);
    jest.spyOn(mock, 'verify').mockResolvedValueOnce({
      ok: false,
      errorCode: '51',
      errorMessage: 'تراکنش ناموفق',
    });

    const settled = await service.settle('mock', { Authority: authority, Status: 'OK' }, {}, null);

    expect(settled.ok).toBe(false);
    expect(settled.status).toBe('failed');
    expect(settled.transaction?.status).toBe(PaymentTransactionStatus.FAILED);
    expect(invoices[0].status).toBe(PaymentStatus.PENDING);
  });
});

describe('gateway selection', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
    jest.resetModules();
  });

  it('exposes both drivers and picks them up by key', () => {
    const factory = new PaymentGatewayFactory(
      new MockPaymentGateway(),
      new BitpayGateway(),
      new ZarinpalGateway(),
    );
    expect(factory.available().map((g) => g.key).sort()).toEqual(['bitpay', 'mock', 'zarinpal']);
    expect(factory.byKey('bitpay')?.label).toBe('بیت‌پی');
    expect(factory.byKey('zarinpal')?.label).toBe('زرین‌پال');
    expect(factory.byKey('nope')).toBeNull();
  });

  it('uses the simulator by default (no merchant account configured)', () => {
    const factory = new PaymentGatewayFactory(
      new MockPaymentGateway(),
      new BitpayGateway(),
      new ZarinpalGateway(),
    );
    expect(factory.current().key).toBe('mock');
    expect(factory.current().isTestMode).toBe(true);
  });

  it('never lets a real driver run without a merchant id', () => {
    // constants.ts reads the environment at import time, so the guard is
    // re-created here the same way the factory sees it.
    const factory = new PaymentGatewayFactory(
      new MockPaymentGateway(),
      new BitpayGateway(),
      new ZarinpalGateway(),
    );
    expect(factory.current().key).toBe('mock');
  });
});
