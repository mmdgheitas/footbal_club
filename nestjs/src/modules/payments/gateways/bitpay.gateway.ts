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
import {
  PAYMENT_API_KEY,
  PAYMENT_MERCHANT_ID,
  PAYMENT_MODE,
} from '../../../config/constants';

/**
 * بیت‌پی — https://bitpay.ir
 *
 * Three steps, exactly as the official documentation describes them:
 *
 *   1. POST https://bitpay.ir/payment/gateway-send
 *        api, amount (ریال), redirect, factorId, name, email, description
 *      → plain text number. Positive = `id_get` (the payment token);
 *        negative = an error code (see PURCHASE_ERRORS).
 *
 *   2. Redirect the payer to
 *        https://bitpay.ir/payment/gateway-{id_get}-get
 *
 *   3. BitPay returns the payer to `redirect` with `trans_id`, `id_get` and
 *      `factorId`, then:
 *      POST https://bitpay.ir/payment/gateway-result-second
 *        api, id_get, trans_id, json=1
 *      → { status, amount, cardNum, factorId }
 *        status 1  = paid and verified now
 *        status 11 = already verified earlier (a replayed callback)
 *        anything else = failure (see VERIFY_ERRORS).
 *
 * Notes that matter in practice:
 *   • BitPay charges in **ریال**; the club stores تومان, so `gatewayAmount`
 *     (amount × PAYMENT_CURRENCY_MULTIPLIER) is what goes on the wire.
 *   • The verify response repeats the amount — it is compared with what we
 *     asked for, so a tampered or mismatched transaction is never credited.
 *   • `factorId` is our invoice id, which is what shows up in the BitPay panel
 *     next to the transaction.
 */
@Injectable()
export class BitpayGateway implements PaymentGateway {
  readonly key = 'bitpay';
  readonly label = 'بیت‌پی';

  private readonly logger = new Logger('BitpayGateway');

  /** Documented purchase (gateway-send) error codes. */
  private static readonly PURCHASE_ERRORS: Record<string, string> = {
    '-1': 'کلید API با درگاه تعریف‌شده در بیت‌پی سازگار نیست.',
    '-2': 'مبلغ نامعتبر است (باید عددی و حداقل ۱۰۰۰ ریال باشد).',
    '-3': 'آدرس بازگشت (redirect) خالی است.',
    '-4': 'درگاهی با این مشخصات وجود ندارد یا هنوز تأیید نشده است.',
    '-5': 'خطا در اتصال به درگاه؛ لطفاً دوباره تلاش کنید.',
  };

  /** Documented verify (gateway-result-second) status codes. */
  private static readonly VERIFY_ERRORS: Record<string, string> = {
    '-1': 'کلید API با درگاه تعریف‌شده در بیت‌پی سازگار نیست.',
    '-2': 'شناسه تراکنش (trans_id) عددی نیست.',
    '-3': 'شناسه پرداخت (id_get) عددی نیست.',
    '-4': 'چنین تراکنشی ثبت نشده یا پرداخت آن ناموفق بوده است.',
  };

  get isTestMode(): boolean {
    return PAYMENT_MODE !== 'production';
  }

  /**
   * BitPay calls the merchant secret «API». Either variable may hold it, so a
   * deployment that already fills PAYMENT_MERCHANT_ID keeps working.
   */
  private get apiKey(): string {
    return (PAYMENT_MERCHANT_ID || PAYMENT_API_KEY || '').trim();
  }

  /** Overridable for a staging endpoint or an outbound proxy. */
  private get baseUrl(): string {
    return (process.env.BITPAY_BASE_URL ?? 'https://bitpay.ir').replace(/\/$/, '');
  }

  async request(input: GatewayRequestInput): Promise<GatewayRequestResult> {
    if (!this.apiKey) {
      return {
        ok: false,
        errorCode: 'NO_API_KEY',
        errorMessage: 'کلید API درگاه بیت‌پی تنظیم نشده است.',
      };
    }

    // BitPay shows factorId in the merchant panel; the invoice id is the most
    // useful thing to see there.
    const factorId = String(input.metadata?.payment_id ?? input.reference);

    const form = new URLSearchParams({
      api: this.apiKey,
      amount: String(input.gatewayAmount),
      redirect: input.callbackUrl,
      factorId,
      name: input.metadata?.payer_name ? String(input.metadata.payer_name) : '',
      email: input.email ?? '',
      description: input.description ?? '',
    });

    try {
      const { data } = await axios.post(`${this.baseUrl}/payment/gateway-send`, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000,
        // The endpoint answers with a bare number, not JSON.
        responseType: 'text',
        transformResponse: [(body: string) => body],
      });

      const raw = String(data ?? '').trim();
      const idGet = Number(raw);

      if (Number.isFinite(idGet) && idGet > 0) {
        return {
          ok: true,
          authority: String(idGet),
          redirectUrl: `${this.baseUrl}/payment/gateway-${idGet}-get`,
          raw: { id_get: idGet },
        };
      }

      return {
        ok: false,
        errorCode: raw || 'UNKNOWN',
        errorMessage:
          BitpayGateway.PURCHASE_ERRORS[raw] ??
          'درخواست پرداخت از سوی بیت‌پی پذیرفته نشد.',
        raw: { response: raw },
      };
    } catch (error) {
      this.logger.error(`gateway-send failed: ${(error as Error).message}`);
      return {
        ok: false,
        errorCode: 'NETWORK',
        errorMessage: 'ارتباط با درگاه بیت‌پی برقرار نشد. لطفاً دوباره تلاش کنید.',
        raw: { error: (error as Error).message },
      };
    }
  }

  /**
   * BitPay returns `trans_id`, `id_get` and `factorId`. The attempt is keyed by
   * `id_get` (what we stored as the authority); `trans_id` is the bank
   * reference and is required by the verify call.
   */
  readCallback(
    query: Record<string, unknown>,
    body: Record<string, unknown>,
  ): GatewayCallback {
    const source = { ...body, ...query };
    const idGet = source.id_get ?? source.idGet ?? null;
    const transId = Number(source.trans_id ?? source.transId ?? 0);

    return {
      authority: idGet != null ? String(idGet) : null,
      // A canceled or failed payment comes back without a usable trans_id.
      succeeded: Number.isFinite(transId) && transId > 0,
      status: source.trans_id != null ? String(source.trans_id) : null,
    };
  }

  async verify(input: GatewayVerifyInput): Promise<GatewayVerifyResult> {
    if (!this.apiKey) {
      return {
        ok: false,
        errorCode: 'NO_API_KEY',
        errorMessage: 'کلید API درگاه بیت‌پی تنظیم نشده است.',
      };
    }

    const callback = input.callback ?? {};
    const transId = String(callback.trans_id ?? callback.transId ?? '').trim();
    if (!transId) {
      return {
        ok: false,
        errorCode: 'NO_TRANS_ID',
        errorMessage: 'شناسه تراکنش از سوی بیت‌پی دریافت نشد.',
      };
    }

    const form = new URLSearchParams({
      api: this.apiKey,
      id_get: input.authority,
      trans_id: transId,
      json: '1',
    });

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/payment/gateway-result-second`,
        form.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 20000,
        },
      );

      const payload = BitpayGateway.asObject(data);
      const status = Number(payload.status ?? NaN);

      // 1 = verified now, 11 = verified earlier (replayed callback).
      if (status === 1 || status === 11) {
        const paidAmount = Number(payload.amount ?? NaN);
        if (Number.isFinite(paidAmount) && paidAmount !== input.gatewayAmount) {
          this.logger.warn(
            `amount mismatch on trans_id ${transId}: paid ${paidAmount}, expected ${input.gatewayAmount}`,
          );
          return {
            ok: false,
            errorCode: 'AMOUNT_MISMATCH',
            errorMessage: 'مبلغ پرداخت‌شده با مبلغ صورتحساب یکسان نیست.',
            raw: payload,
          };
        }

        return {
          ok: true,
          alreadyVerified: status === 11,
          refId: transId,
          cardPan: payload.cardNum ? String(payload.cardNum) : undefined,
          raw: payload,
        };
      }

      return {
        ok: false,
        errorCode: String(payload.status ?? 'UNKNOWN'),
        errorMessage:
          BitpayGateway.VERIFY_ERRORS[String(status)] ??
          'تأیید پرداخت از سوی بیت‌پی انجام نشد. در صورت کسر وجه، مبلغ حداکثر تا ۷۲ ساعت بازمی‌گردد.',
        raw: payload,
      };
    } catch (error) {
      this.logger.error(`gateway-result-second failed: ${(error as Error).message}`);
      return {
        ok: false,
        errorCode: 'NETWORK',
        errorMessage: 'ارتباط با بیت‌پی برای تأیید پرداخت برقرار نشد.',
        raw: { error: (error as Error).message },
      };
    }
  }

  /** The verify endpoint answers with JSON, but has been seen to send text. */
  private static asObject(data: unknown): Record<string, unknown> {
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    try {
      const parsed = JSON.parse(String(data));
      return parsed && typeof parsed === 'object' ? parsed : { status: Number(String(data)) };
    } catch {
      return { status: Number(String(data).trim()) };
    }
  }
}
