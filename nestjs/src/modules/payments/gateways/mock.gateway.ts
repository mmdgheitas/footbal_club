import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  GatewayCallback,
  GatewayRequestInput,
  GatewayRequestResult,
  GatewayVerifyInput,
  GatewayVerifyResult,
  PaymentGateway,
} from './payment-gateway.interface';

/**
 * درگاه شبیه‌ساز — a gateway that needs no merchant account and no network.
 *
 * It mirrors the real dance exactly (request → redirect → callback → verify),
 * but the "bank page" is a local page (`/payments/mock/:authority`) with a pay
 * and a cancel button. That keeps the entire payment flow — including the
 * verify guard, the ledger entries and the notifications — clickable in
 * development, in the test suite and in a demo, without moving a single ریال.
 *
 * PAYMENT_GATEWAY=mock (the default) selects it.
 */
@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  readonly key = 'mock';
  readonly label = 'درگاه شبیه‌ساز (تستی)';
  readonly isTestMode = true;

  private readonly logger = new Logger('MockPaymentGateway');

  /** Tokens this process handed out, with the amount they were issued for. */
  private readonly issued = new Map<string, number>();

  async request(input: GatewayRequestInput): Promise<GatewayRequestResult> {
    const authority = `MOCK-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    this.issued.set(authority, input.gatewayAmount);

    const separator = input.callbackUrl.includes('?') ? '&' : '?';
    const redirectUrl =
      `/payments/mock/${authority}` +
      `?amount=${encodeURIComponent(String(input.amount))}` +
      `&callback=${encodeURIComponent(`${input.callbackUrl}${separator}Authority=${authority}`)}`;

    this.logger.log(
      `[MOCK GATEWAY] ${input.description} — ${input.amount} تومان — authority ${authority}`,
    );

    return { ok: true, authority, redirectUrl, raw: { authority, amount: input.gatewayAmount } };
  }

  readCallback(
    query: Record<string, unknown>,
    body: Record<string, unknown>,
  ): GatewayCallback {
    const source = { ...body, ...query };
    const authority = (source.Authority ?? source.authority ?? null) as string | null;
    const status = String(source.Status ?? source.status ?? '').toUpperCase();
    return { authority, succeeded: status === 'OK', status: status || null };
  }

  async verify(input: GatewayVerifyInput): Promise<GatewayVerifyResult> {
    const expected = this.issued.get(input.authority);

    // A token this process never issued (restart, replay, forged link) is not
    // verifiable — the real gateways answer the same way.
    if (expected === undefined) {
      return {
        ok: false,
        errorCode: 'UNKNOWN_AUTHORITY',
        errorMessage: 'تراکنش در درگاه شبیه‌ساز یافت نشد.',
      };
    }

    if (expected !== input.gatewayAmount) {
      return {
        ok: false,
        errorCode: 'AMOUNT_MISMATCH',
        errorMessage: 'مبلغ تراکنش با مبلغ صورتحساب یکسان نیست.',
      };
    }

    this.issued.delete(input.authority);
    const refId = String(Date.now()).slice(-10);
    return {
      ok: true,
      refId,
      cardPan: '6037********1234',
      raw: { refId, amount: input.gatewayAmount, mocked: true },
    };
  }
}
