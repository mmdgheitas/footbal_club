import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { GuestOnly, Public } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { isValidMobile, maskPhone, normalizePhone } from '../../common/helpers/phone.helper';
import { OtpService } from './otp.service';
import { Identity, IdentityService } from './identity.service';
import { OTP_LENGTH, OTP_TTL_SECONDS, ROLE_HOME } from '../../config/constants';

/**
 * ورود واحد با موبایل + کد یک‌بارمصرف.
 *
 * There is exactly one login page for every role. The flow is:
 *
 *   GET  /login              شماره موبایل
 *   POST /login/otp/request  ارسال کد
 *   GET  /login/otp          صفحه وارد کردن کد
 *   POST /login/otp/verify   تأیید کد → تشخیص نقش → ریدایرکت به پنل
 *   GET  /login/choose       فقط وقتی یک شماره چند نقش دارد
 *
 * The legacy email + password endpoint (POST /login in AuthController) is left
 * in place as a staff fallback; nothing else depends on it.
 */
@Controller()
@Public()
export class OtpAuthController extends BaseController {
  protected layout = 'layouts/auth';

  constructor(
    private readonly otp: OtpService,
    private readonly identity: IdentityService,
  ) {
    super();
  }

  // --------------------------------------------------------------- request

  /** POST /login/otp/request — ارسال کد به شماره موبایل */
  @Post('/login/otp/request')
  @GuestOnly()
  async requestCode(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است. دوباره تلاش کنید.');
      return this.redirect(res, '/login');
    }

    const phone = normalizePhone(String(this.post(req, 'phone') ?? ''));

    if (!isValidMobile(phone)) {
      this.flash(req, 'error', 'شماره موبایل معتبر نیست. نمونه صحیح: ۰۹۱۲۱۲۳۴۵۶۷');
      return this.redirect(res, '/login');
    }

    // Resolve first: telling an unknown number to wait for an SMS is worse
    // than telling them their number is not registered.
    const resolved = await this.identity.resolve(phone);
    if (resolved.identities.length === 0) {
      this.flash(
        req,
        'error',
        resolved.blocked ??
          'این شماره در سیستم باشگاه ثبت نشده است. برای ثبت‌نام با دفتر باشگاه تماس بگیرید.',
      );
      return this.redirect(res, '/login');
    }

    const result = await this.otp.request(phone, SecurityHelper.getClientIp(req));
    if (!result.ok) {
      this.flash(req, 'error', result.error ?? 'ارسال کد ناموفق بود.');
      return this.redirect(res, '/login');
    }

    const session = req.session as any;
    session.otp_phone = phone;
    session.otp_sent_at = Date.now();
    session.otp_dev_code = result.devCode ?? null;

    this.flash(req, 'success', `کد ${OTP_LENGTH} رقمی به شماره ${maskPhone(phone)} ارسال شد.`);
    session.save(() => this.redirect(res, '/login/otp'));
  }

  /** GET /login/otp — صفحه وارد کردن کد */
  @Get('/login/otp')
  @GuestOnly()
  verifyPage(@Req() req: Request, @Res() res: Response): void {
    const session = req.session as any;
    const phone: string | undefined = session.otp_phone;

    if (!phone) {
      this.flash(req, 'error', 'ابتدا شماره موبایل خود را وارد کنید.');
      return this.redirect(res, '/login');
    }

    this.render(req, res, 'auth/otp', {
      title: 'تأیید کد ورود',
      phone,
      masked_phone: maskPhone(phone),
      otp_length: OTP_LENGTH,
      ttl_seconds: OTP_TTL_SECONDS,
      dev_code: session.otp_dev_code ?? null,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /login/otp/verify — تأیید کد و ورود */
  @Post('/login/otp/verify')
  @GuestOnly()
  async verify(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است. دوباره تلاش کنید.');
      return this.redirect(res, '/login');
    }

    const session = req.session as any;
    const phone: string | undefined = session.otp_phone;
    if (!phone) {
      this.flash(req, 'error', 'نشست ورود منقضی شده است. دوباره تلاش کنید.');
      return this.redirect(res, '/login');
    }

    const code = String(this.post(req, 'code') ?? '');
    const verified = await this.otp.verify(phone, code);
    if (!verified.ok) {
      this.flash(req, 'error', verified.error ?? 'کد نامعتبر است.');
      return this.redirect(res, '/login/otp');
    }

    const resolved = await this.identity.resolve(phone);
    if (resolved.identities.length === 0) {
      this.flash(req, 'error', resolved.blocked ?? 'حسابی برای این شماره یافت نشد.');
      return this.redirect(res, '/login');
    }

    if (resolved.identities.length > 1) {
      session.otp_identities = resolved.identities;
      session.otp_verified_phone = phone;
      return this.redirect(res, '/login/choose');
    }

    return this.completeLogin(req, res, resolved.identities[0], phone);
  }

  /** GET /login/choose — یک شماره، چند نقش */
  @Get('/login/choose')
  @GuestOnly()
  choose(@Req() req: Request, @Res() res: Response): void {
    const session = req.session as any;
    const identities: Identity[] | undefined = session.otp_identities;

    if (!identities || identities.length === 0) {
      return this.redirect(res, '/login');
    }

    this.render(req, res, 'auth/choose_panel', {
      title: 'انتخاب پنل',
      identities,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /login/choose */
  @Post('/login/choose')
  @GuestOnly()
  async chooseSubmit(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است.');
      return this.redirect(res, '/login');
    }

    const session = req.session as any;
    const identities: Identity[] | undefined = session.otp_identities;
    const phone: string | undefined = session.otp_verified_phone;

    if (!identities || !phone) {
      this.flash(req, 'error', 'نشست ورود منقضی شده است.');
      return this.redirect(res, '/login');
    }

    const key = String(this.post(req, 'identity') ?? '');
    const identity = identities.find((i) => `${i.kind}:${i.id}` === key);

    if (!identity) {
      this.flash(req, 'error', 'پنل انتخاب‌شده معتبر نیست.');
      return this.redirect(res, '/login/choose');
    }

    return this.completeLogin(req, res, identity, phone);
  }

  /** POST /login/otp/resend */
  @Post('/login/otp/resend')
  @GuestOnly()
  async resend(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است.');
      return this.redirect(res, '/login');
    }

    const session = req.session as any;
    const phone: string | undefined = session.otp_phone;
    if (!phone) {
      return this.redirect(res, '/login');
    }

    const result = await this.otp.request(phone, SecurityHelper.getClientIp(req));
    if (!result.ok) {
      this.flash(req, 'error', result.error ?? 'ارسال مجدد ناموفق بود.');
    } else {
      session.otp_dev_code = result.devCode ?? null;
      this.flash(req, 'success', 'کد جدید ارسال شد.');
    }

    session.save(() => this.redirect(res, '/login/otp'));
  }

  // ---------------------------------------------------------------- helper

  private async completeLogin(
    req: Request,
    res: Response,
    identity: Identity,
    phone: string,
  ): Promise<void> {
    const sessionUser = await this.identity.sessionUserFor(identity);
    await this.identity.touchLastLogin(identity);

    const ip = SecurityHelper.getClientIp(req);
    const userAgent = (req.headers['user-agent'] as string) ?? '';

    req.session.regenerate((err) => {
      if (err) {
        this.flash(req, 'error', 'خطایی رخ داد. دوباره تلاش کنید.');
        return this.redirect(res, '/login');
      }

      const s = req.session as any;
      s.user_id = identity.kind === 'guardian' ? identity.id : (sessionUser.id as number);
      s.user_role = identity.role;
      s.user = sessionUser;
      s.guardian_id = identity.guardianId;
      s.player_id = identity.playerId;
      s.login_phone = phone;
      s.login_time = Date.now();
      s.ip_address = ip;
      s.user_agent = userAgent;

      this.flash(req, 'success', `${identity.name} عزیز، خوش آمدید!`);

      s.save(() => this.redirect(res, ROLE_HOME[identity.role] ?? '/dashboard'));
    });
  }
}
