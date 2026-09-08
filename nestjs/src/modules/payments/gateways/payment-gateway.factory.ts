import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway } from './payment-gateway.interface';
import { MockPaymentGateway } from './mock.gateway';
import { BitpayGateway } from './bitpay.gateway';
import { ZarinpalGateway } from './zarinpal.gateway';
import {
  PAYMENT_API_KEY,
  PAYMENT_GATEWAY,
  PAYMENT_MERCHANT_ID,
  PAYMENT_MODE,
} from '../../../config/constants';

/**
 * انتخاب درگاه — mirrors the SmsService provider pattern already used for SMS.
 *
 *   PAYMENT_GATEWAY = mock | zarinpal | …   (which driver)
 *   PAYMENT_MODE    = mock | sandbox | production   (which environment)
 *
 * Guard rails, because a misconfigured production gateway silently swallowing
 * money is worse than a loud refusal:
 *   • an unknown driver name falls back to the simulator and says so;
 *   • production without PAYMENT_MERCHANT_ID falls back to the simulator too.
 *
 * Adding a gateway: implement PaymentGateway in ./<name>.gateway.ts, provide it
 * in payments.module.ts and add one line to `drivers` below.
 */
@Injectable()
export class PaymentGatewayFactory {
  private readonly logger = new Logger('PaymentGateway');
  private readonly drivers: Record<string, PaymentGateway>;

  constructor(
    private readonly mock: MockPaymentGateway,
    private readonly bitpay: BitpayGateway,
    private readonly zarinpal: ZarinpalGateway,
  ) {
    this.drivers = {
      [this.mock.key]: this.mock,
      [this.bitpay.key]: this.bitpay,
      [this.zarinpal.key]: this.zarinpal,
    };
  }

  /** Every driver the build knows about — for the admin settings screen. */
  available(): PaymentGateway[] {
    return Object.values(this.drivers);
  }

  byKey(key: string): PaymentGateway | null {
    return this.drivers[(key ?? '').toLowerCase()] ?? null;
  }

  /** The driver the application is configured to use right now. */
  current(): PaymentGateway {
    if (PAYMENT_MODE === 'mock') return this.mock;

    const driver = this.byKey(PAYMENT_GATEWAY);
    if (!driver) {
      this.logger.warn(
        `PAYMENT_GATEWAY="${PAYMENT_GATEWAY}" is not a known driver; using the simulator.`,
      );
      return this.mock;
    }

    // BitPay calls it «API», ZarinPal «merchant id»; either variable may hold
    // the secret. Without one, no real driver may run.
    const secret = PAYMENT_MERCHANT_ID || PAYMENT_API_KEY;
    if (driver.key !== 'mock' && !secret) {
      this.logger.warn(
        `PAYMENT_GATEWAY=${driver.key} but neither PAYMENT_MERCHANT_ID nor ` +
          `PAYMENT_API_KEY is set; using the simulator instead.`,
      );
      return this.mock;
    }

    return driver;
  }
}
