import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  GatewayCallback,
  GatewayRequestInput,
  GatewayRequestResult,
  GatewayVerifyInput,
  GatewayVerifyResult,
  PaymentGateway,
} from './payment-gateway.interface';
import { PAYMENT_MERCHANT_ID, PAYMENT_MODE } from '../../../config/constants';

/**
 * زرین‌پال — REST v4, the reference implementation of a real gateway driver.
 *
 *   request : POST {base}/pg/v4/payment/request.json
 *   redirect:      {base}/pg/StartPay/{authority}
 *   verify  : POST {base}/pg/v4/payment/verify.json
 *
 * Amounts go out in ریال (see PAYMENT_CURRENCY_MULTIPLIER). `code: 100` means
 * success, `code: 101` on verify means "already verified" — which the caller
 * must treat as success without crediting the invoice twice.
 *
 * Use this file as the template when plugging a different gateway in: copy it,
 * change the three endpoints and the field names, register the class in
 * payment-gateway.factory.ts. Nothing outside the driver changes.
 */
@Injectable()
export class ZarinpalGateway implements PaymentGateway {
  readonly key = 'zarinpal';
  readonly label = 'زرین‌پال';

  private readonly logger = new Logger('ZarinpalGateway');

  get isTestMode(): boolean {
    return PAYMENT_MODE !== 'production';
  }

  private get baseUrl(): string {
    return this.isTestMode ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
  }

  private get merchantId(): string {
    // The sandbox accepts any well-formed uuid-shaped merchant id.
    return PAYMENT_MERCHANT_ID || '00000000-0000-0000-0000-000000000000';
  }

  async request(input: GatewayRequestInput): Promise<GatewayRequestResult> {
    const payload = {
      merchant_id: this.merchantId,
      amount: input.gatewayAmount,
      callback_url: input.callbackUrl,
      description: input.description,
      metadata: {
        mobile: input.mobile ?? undefined,
        email: input.email ?? undefined,
        order_id: input.reference,
      },
    };

    try {
      const { data } = await axios.post(`${this.baseUrl}/pg/v4/payment/request.json`, payload, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 20000,
      });

      const code = Number(data?.data?.code ?? 0);
      const authority = data?.data?.authority as string | undefined;

      if (code === 100 && authority) {
        return {
          ok: true,
          authority,
          redirectUrl: `${this.baseUrl}/pg/StartPay/${authority}`,
          raw: data,
        };
      }

      return {
        ok: false,
        errorCode: String(data?.errors?.code ?? code),
        errorMessage: String(data?.errors?.message ?? 'درخواست پرداخت از سوی درگاه پذیرفته نشد.'),
        raw: data,
      };
    } catch (error) {
      this.logger.error(`request failed: ${(error as Error).message}`);
      return {
        ok: false,
        errorCode: 'NETWORK',
        errorMessage: 'ارتباط با درگاه پرداخت برقرار نشد. لطفاً دوباره تلاش کنید.',
        raw: { error: (error as Error).message },
      };
    }
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
    const payload = {
      merchant_id: this.merchantId,
      amount: input.gatewayAmount,
      authority: input.authority,
    };

    try {
      const { data } = await axios.post(`${this.baseUrl}/pg/v4/payment/verify.json`, payload, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 20000,
      });

      const code = Number(data?.data?.code ?? data?.errors?.code ?? 0);

      // 100 = verified now, 101 = verified earlier (replayed callback).
      if (code === 100 || code === 101) {
        return {
          ok: true,
          alreadyVerified: code === 101,
          refId: data?.data?.ref_id != null ? String(data.data.ref_id) : undefined,
          cardPan: data?.data?.card_pan ? String(data.data.card_pan) : undefined,
          raw: data,
        };
      }

      return {
        ok: false,
        errorCode: String(code),
        errorMessage: String(data?.errors?.message ?? 'تأیید پرداخت از سوی درگاه انجام نشد.'),
        raw: data,
      };
    } catch (error) {
      this.logger.error(`verify failed: ${(error as Error).message}`);
      return {
        ok: false,
        errorCode: 'NETWORK',
        errorMessage: 'ارتباط با درگاه برای تأیید پرداخت برقرار نشد.',
        raw: { error: (error as Error).message },
      };
    }
  }
}
