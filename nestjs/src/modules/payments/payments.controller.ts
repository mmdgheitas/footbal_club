import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Public, Roles } from '../../common/decorators/permissions.decorator';
import {
  getSessionGuardianId,
  getSessionPlayerId,
  getSessionUserId,
  getSessionUserRole,
} from '../../common/session/session.types';
import { PayerType, PaymentTransactionStatus } from '../../database/entities';
import {
  PAYMENT_CALLBACK_URL,
  PAYMENT_MODE,
  PAYMENT_MODES,
  PAYMENT_TRANSACTION_ICONS,
  PAYMENT_TRANSACTION_STATUSES,
} from '../../config/constants';
import { PaymentService, Payer } from './payment.service';
import { PaymentGatewayFactory } from './gateways/payment-gateway.factory';

/**
 * پرداخت آنلاین — the payer-facing side of the gateway.
 *
 *   POST /payments/start/:paymentId   guardian or player opens an attempt
 *   GET|POST /payments/callback/:gw   the gateway returns the user (public)
 *   GET  /payments/result/:id         receipt / failure page
 *   GET|POST /payments/mock/:token    the simulator's "bank page" (test modes)
 *
 * The callback route is deliberately @Public(): the browser comes back from the
 * bank, and on some gateways the session cookie is not resent (SameSite). The
 * attempt is therefore identified by its gateway token, never by the session,
 * and the money is confirmed by asking the gateway — not by trusting the query
 * string.
 */
@Controller('/payments')
export class PaymentsController extends BaseController {
  constructor(
    private readonly payments: PaymentService,
    private readonly gateways: PaymentGatewayFactory,
  ) {
    super();
  }

  /** Who is paying, based on the session. */
  private payer(req: Request): Payer | null {
    const guardianId = getSessionGuardianId(req);
    if (guardianId) return { type: PayerType.GUARDIAN, id: guardianId };

    const playerId = getSessionPlayerId(req);
    if (playerId) return { type: PayerType.PLAYER, id: playerId };

    const role = getSessionUserRole(req);
    const userId = getSessionUserId(req);
    if (userId && (role === 'super_admin' || role === 'accountant')) {
      return { type: PayerType.ADMIN, id: userId };
    }
    return null;
  }

  /**
   * Public origin the gateway must call back to.
   *
   * `PAYMENT_CALLBACK_URL` wins when set — that is the reliable answer behind a
   * reverse proxy, a tunnel or a sub-path deployment, and it is what should be
   * configured in production. Otherwise the origin of the request itself is
   * used, which is correct for a plain deployment and for the dev preview.
   * APP_URL is deliberately not consulted: in this repository it is a display
   * URL and ships as `http://localhost`, which no gateway could reach.
   */
  private baseUrl(req: Request): string {
    const basePath = (process.env.APP_BASE_PATH ?? '').replace(/\/$/, '');

    const configured = PAYMENT_CALLBACK_URL.trim().replace(/\/$/, '');
    if (configured) return configured;

    const proto =
      ((req.headers['x-forwarded-proto'] as string) || '').split(',')[0].trim() ||
      req.protocol ||
      'http';
    const host =
      ((req.headers['x-forwarded-host'] as string) || '').split(',')[0].trim() ||
      req.get('host') ||
      'localhost';
    return `${proto}://${host}${basePath}`;
  }

  private backTo(req: Request): string {
    const payer = this.payer(req);
    if (payer?.type === PayerType.PLAYER) return '/app/profile';
    if (payer?.type === PayerType.GUARDIAN) return '/guardian/financial';
    return '/admin/payments';
  }

  /** POST /payments/start/:paymentId — begin an attempt and go to the gateway. */
  @Post('/start/:paymentId')
  @Roles('guardian', 'player', 'super_admin', 'accountant')
  async start(
    @Param('paymentId') paymentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'درخواست نامعتبر است.');
      this.redirect(res, this.backTo(req));
      return;
    }

    const payer = this.payer(req);
    if (!payer) {
      this.redirect(res, '/login');
      return;
    }

    const result = await this.payments.start(Number(paymentId), payer, this.baseUrl(req));
    if (!result.ok || !result.redirectUrl) {
      this.flash(req, 'error', result.error ?? 'شروع پرداخت ممکن نشد.');
      this.redirect(res, this.backTo(req));
      return;
    }

    // Absolute gateway URL, or the simulator's local page.
    if (/^https?:\/\//i.test(result.redirectUrl)) {
      res.redirect(result.redirectUrl);
      return;
    }
    this.redirect(res, result.redirectUrl);
  }

  /** GET /payments/callback/:gateway — the gateway sends the payer back here. */
  @Get('/callback/:gateway')
  @Public()
  async callbackGet(
    @Param('gateway') gateway: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleCallback(gateway, query, {}, req, res);
  }

  /** Some gateways POST the result instead of using the query string. */
  @Post('/callback/:gateway')
  @Public()
  async callbackPost(
    @Param('gateway') gateway: string,
    @Query() query: Record<string, unknown>,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleCallback(gateway, query, body, req, res);
  }

  private async handleCallback(
    gateway: string,
    query: Record<string, unknown>,
    body: Record<string, unknown>,
    req: Request,
    res: Response,
  ): Promise<void> {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
    const settled = await this.payments.settle(gateway, query, body, ip);

    if (settled.transaction) {
      this.redirect(res, `/payments/result/${settled.transaction.id}`);
      return;
    }

    // No transaction at all: nothing to show a receipt for.
    this.render(req, res, 'payments/result', {
      title: 'نتیجه پرداخت',
      transaction: null,
      payment: null,
      player: null,
      outcome: 'unknown',
      error: settled.error ?? 'تراکنش یافت نشد.',
      statuses: PAYMENT_TRANSACTION_STATUSES,
      status_icons: PAYMENT_TRANSACTION_ICONS,
      back_url: '/login',
    });
  }

  /** GET /payments/result/:id — receipt (success) or reason (failure). */
  @Get('/result/:id')
  @Public()
  async result(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const transaction = await this.payments.findTransaction(Number(id));
    if (!transaction) {
      this.render(
        req,
        res,
        'payments/result',
        {
          title: 'نتیجه پرداخت',
          transaction: null,
          payment: null,
          player: null,
          outcome: 'unknown',
          error: 'تراکنش یافت نشد.',
          statuses: PAYMENT_TRANSACTION_STATUSES,
          status_icons: PAYMENT_TRANSACTION_ICONS,
          back_url: '/login',
        },
        404,
      );
      return;
    }

    const payment = await this.payments.findInvoice(transaction.paymentId);
    const outcome =
      transaction.status === PaymentTransactionStatus.VERIFIED
        ? 'success'
        : transaction.status === PaymentTransactionStatus.CANCELED
          ? 'canceled'
          : 'failed';

    this.render(req, res, 'payments/result', {
      title: 'نتیجه پرداخت',
      transaction,
      payment,
      outcome,
      error: transaction.errorMessage,
      statuses: PAYMENT_TRANSACTION_STATUSES,
      status_icons: PAYMENT_TRANSACTION_ICONS,
      gateway_label: this.gateways.byKey(transaction.gateway)?.label ?? transaction.gateway,
      test_mode: transaction.mode !== 'production',
      back_url: this.backTo(req),
    });
  }

  // ------------------------------------------------------------- simulator

  /**
   * GET /payments/mock/:authority — the simulator's bank page.
   *
   * Only reachable while the simulator is the active gateway; in production
   * with a real gateway this page refuses to render, so it can never be used to
   * fake a payment.
   */
  @Get('/mock/:authority')
  @Public()
  mockPage(
    @Param('authority') authority: string,
    @Query('amount') amount: string,
    @Query('callback') callback: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    if (this.gateways.current().key !== 'mock') {
      this.render(req, res, 'errors/404', { title: 'یافت نشد' }, 404);
      return;
    }

    this.render(req, res, 'payments/mock', {
      title: 'درگاه شبیه‌ساز',
      authority,
      amount: Number(amount ?? 0),
      callback_url: callback ?? '',
      mode_label: PAYMENT_MODES[PAYMENT_MODE] ?? PAYMENT_MODE,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /payments/mock/:authority — "pay" or "cancel" on the simulator. */
  @Post('/mock/:authority')
  @Public()
  mockSubmit(
    @Param('authority') authority: string,
    @Body() body: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    if (this.gateways.current().key !== 'mock') {
      this.render(req, res, 'errors/404', { title: 'یافت نشد' }, 404);
      return;
    }

    const status = body.action === 'pay' ? 'OK' : 'NOK';
    const callback = String(body.callback_url ?? '');
    const target = callback || `/payments/callback/mock?Authority=${authority}`;
    const separator = target.includes('?') ? '&' : '?';
    const url = `${target}${separator}Status=${status}`;

    if (/^https?:\/\//i.test(url)) {
      res.redirect(url);
      return;
    }
    this.redirect(res, url);
  }
}
