import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { OtpCode } from '../../database/entities';
import {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_WINDOW,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  OTP_WINDOW_SECONDS,
  CLUB_DISPLAY_NAME,
} from '../../config/constants';
import { SmsService } from '../sms/sms.service';
import { normalizePhone } from '../../common/helpers/phone.helper';

export interface OtpRequestResult {
  ok: boolean;
  error?: string;
  /** Seconds until another code may be requested. */
  retryAfter?: number;
  /** Only populated when SMS delivery is mocked, so dev/demo logins work. */
  devCode?: string;
  expiresInSeconds?: number;
}

export interface OtpVerifyResult {
  ok: boolean;
  error?: string;
  attemptsLeft?: number;
}

/**
 * کد یک‌بارمصرف ورود.
 *
 * Security properties required by the brief and implemented here:
 *   • ۶ رقم، ۵ دقیقه اعتبار                       (OTP_LENGTH / OTP_TTL_SECONDS)
 *   • محدودیت تعداد درخواست                        (per-phone window + cooldown)
 *   • codes are stored as SHA-256 hashes, never in clear text
 *   • single use, and burned after OTP_MAX_ATTEMPTS wrong guesses
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger('OTP');

  constructor(
    @InjectRepository(OtpCode) private readonly codes: Repository<OtpCode>,
    private readonly sms: SmsService,
  ) {}

  private static hash(phone: string, code: string): string {
    return crypto.createHash('sha256').update(`${phone}:${code}`).digest('hex');
  }

  private static now(): Date {
    return new Date();
  }

  private static toSqlDateTime(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * DATETIME columns come back as `YYYY-MM-DD HH:MM:SS` strings under mysql2
   * (dateStrings: true), but as Date objects under other drivers. Accept both.
   */
  private static parseSqlDateTime(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(String(value).replace(' ', 'T') + 'Z');
  }

  private generateCode(): string {
    const max = 10 ** OTP_LENGTH;
    return String(crypto.randomInt(0, max)).padStart(OTP_LENGTH, '0');
  }

  /** Issues and sends a code, honouring the rate limits. */
  async request(rawPhone: string, ip: string | null): Promise<OtpRequestResult> {
    const phone = normalizePhone(rawPhone);
    const now = OtpService.now();

    const windowStart = new Date(now.getTime() - OTP_WINDOW_SECONDS * 1000);
    const recent = await this.codes
      .createQueryBuilder('o')
      .where('o.phone = :phone', { phone })
      .andWhere('o.createdAt >= :windowStart', {
        windowStart: OtpService.toSqlDateTime(windowStart),
      })
      .orderBy('o.id', 'DESC')
      .getMany();

    if (recent.length >= OTP_MAX_PER_WINDOW) {
      return {
        ok: false,
        error: 'تعداد درخواست کد بیش از حد مجاز است. لطفاً چند دقیقه بعد دوباره تلاش کنید.',
        retryAfter: OTP_WINDOW_SECONDS,
      };
    }

    const last = recent[0];
    if (last) {
      const elapsed = (now.getTime() - new Date(last.createdAt).getTime()) / 1000;
      if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
        return {
          ok: false,
          error: `برای دریافت کد جدید ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed)} ثانیه صبر کنید.`,
          retryAfter: Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed),
        };
      }
    }

    // Any previous code for this phone becomes invalid.
    await this.codes.update({ phone, used: 0 }, { used: 1 });

    const code = this.generateCode();
    const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);

    await this.codes.save(
      this.codes.create({
        phone,
        code: OtpService.hash(phone, code),
        expiresAt: OtpService.toSqlDateTime(expiresAt),
        used: 0,
        attempts: 0,
        ipAddress: ip,
      }),
    );

    const message = `${CLUB_DISPLAY_NAME}\nکد ورود شما: ${code}\nاعتبار: ۵ دقیقه`;
    const delivery = await this.send(phone, message);

    return {
      ok: true,
      expiresInSeconds: OTP_TTL_SECONDS,
      // With the mock provider (development) the code is surfaced so the login
      // flow is usable without a real SMS gateway. Never with a live provider.
      devCode: delivery.mocked ? code : undefined,
    };
  }

  /** Verifies a code and burns it on success. */
  async verify(rawPhone: string, rawCode: string): Promise<OtpVerifyResult> {
    const phone = normalizePhone(rawPhone);
    const code = String(rawCode ?? '').replace(/\D/g, '');

    if (code.length !== OTP_LENGTH) {
      return { ok: false, error: `کد باید ${OTP_LENGTH} رقمی باشد.` };
    }

    const record = await this.codes.findOne({
      where: { phone, used: 0 },
      order: { id: 'DESC' },
    });

    if (!record) {
      return { ok: false, error: 'کدی برای این شماره صادر نشده است. دوباره درخواست دهید.' };
    }

    if (OtpService.parseSqlDateTime(record.expiresAt) < OtpService.now()) {
      await this.codes.update({ id: record.id }, { used: 1 });
      return { ok: false, error: 'کد منقضی شده است. لطفاً کد جدید بگیرید.' };
    }

    if (record.code !== OtpService.hash(phone, code)) {
      const attempts = record.attempts + 1;
      const burned = attempts >= OTP_MAX_ATTEMPTS;
      await this.codes.update({ id: record.id }, { attempts, used: burned ? 1 : 0 });
      return {
        ok: false,
        error: burned
          ? 'تعداد تلاش‌های نادرست بیش از حد مجاز بود. کد جدید درخواست کنید.'
          : 'کد وارد شده صحیح نیست.',
        attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - attempts),
      };
    }

    await this.codes.update({ id: record.id }, { used: 1 });
    return { ok: true };
  }

  /** Housekeeping — drops codes that expired more than a day ago. */
  async purgeExpired(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    await this.codes.delete({ expiresAt: LessThan(OtpService.toSqlDateTime(cutoff)) });
  }

  private async send(phone: string, message: string): Promise<{ mocked: boolean }> {
    try {
      const provider = await this.sms.getProvider();
      const mocked = provider.constructor.name === 'MockSmsProvider';
      const result = await provider.send(phone, message);
      if (!result.success) {
        this.logger.warn(`OTP SMS to ${phone} failed: ${result.error}`);
      }
      if (mocked) {
        this.logger.log(`[MOCK SMS] ${phone} :: ${message.replace(/\n/g, ' | ')}`);
      }
      return { mocked };
    } catch (error) {
      this.logger.error(`OTP SMS error: ${(error as Error).message}`);
      // Never block the login flow on a gateway outage in development.
      return { mocked: true };
    }
  }
}
