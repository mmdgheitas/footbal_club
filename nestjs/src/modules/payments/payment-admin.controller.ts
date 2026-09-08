import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseController } from '../../common/views/base.controller';
import { Permissions, Roles } from '../../common/decorators/permissions.decorator';
import { getSessionUserId } from '../../common/session/session.types';
import {
  PAYMENT_GATEWAY,
  PAYMENT_MODE,
  PAYMENT_MODES,
  PAYMENT_STATUSES,
  PAYMENT_TRANSACTION_ICONS,
  PAYMENT_TRANSACTION_STATUSES,
} from '../../config/constants';
import { PaymentService } from './payment.service';
import { PaymentGatewayFactory } from './gateways/payment-gateway.factory';

/**
 * صورتحساب‌ها و تراکنش‌های درگاه — the office side of the payment system.
 *
 *   GET  /admin/invoices              issue and review invoices
 *   POST /admin/invoices              issue one (becomes payable online at once)
 *   POST /admin/invoices/:id/cancel   withdraw an unpaid invoice
 *   GET  /admin/payments              every attempt at the gateway
 *
 * Issuing money-related rows is restricted to the roles that already hold the
 * financial permissions; coaches can reach none of it.
 */
@Controller('/admin')
export class PaymentAdminController extends BaseController {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly payments: PaymentService,
    private readonly gateways: PaymentGatewayFactory,
  ) {
    super();
  }

  private gatewayChrome(): Record<string, unknown> {
    const active = this.gateways.current();
    return {
      gateway_key: active.key,
      gateway_label: active.label,
      gateway_test_mode: active.isTestMode,
      gateway_configured: PAYMENT_GATEWAY,
      mode: PAYMENT_MODE,
      mode_label: PAYMENT_MODES[PAYMENT_MODE] ?? PAYMENT_MODE,
      gateways: this.gateways.available().map((g) => ({ key: g.key, label: g.label })),
    };
  }

  /** GET /admin/invoices — صورتحساب‌ها */
  @Get('/invoices')
  @Roles('super_admin', 'accountant')
  async invoices(
    @Query('status') status: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const selected = ['pending', 'completed', 'failed', 'refunded'].includes(status)
      ? status
      : 'pending';

    const rows = await this.db.query(
      `SELECT p.*, pl.name AS player_name, c.name AS classroom_name,
              (SELECT COUNT(*) FROM fc_payment_transactions t WHERE t.payment_id = p.id) AS attempts
       FROM fc_payments p
       JOIN fc_players pl ON pl.id = p.player_id
       LEFT JOIN fc_classrooms c ON c.id = pl.classroom_id
       WHERE p.deleted_at IS NULL AND p.status = ?
       ORDER BY p.due_date IS NULL, p.due_date ASC, p.id DESC
       LIMIT 300`,
      [selected],
    );

    const counts = await this.db.query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
       FROM fc_payments WHERE deleted_at IS NULL GROUP BY status`,
    );

    const players = await this.db.query(
      `SELECT id, name FROM fc_players
       WHERE deleted_at IS NULL AND registration_status = 'approved'
       ORDER BY name ASC`,
    );

    this.render(req, res, 'admin/invoices', {
      title: 'صورتحساب‌ها',
      rows,
      counts,
      players,
      statuses: PAYMENT_STATUSES,
      selected_status: selected,
      csrf_token: this.generateCsrf(req),
      ...this.gatewayChrome(),
    });
  }

  /** POST /admin/invoices — صدور صورتحساب */
  @Post('/invoices')
  @Roles('super_admin', 'accountant')
  async createInvoice(
    @Body() body: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'درخواست نامعتبر است.');
      this.redirect(res, '/admin/invoices');
      return;
    }

    const invoice = await this.payments.createInvoice({
      playerId: Number(body.player_id),
      amount: Number(String(body.amount ?? '').replace(/[^\d.]/g, '')),
      description: body.description ?? null,
      dueDate: body.due_date || null,
      createdBy: getSessionUserId(req),
    });

    if (!invoice) {
      this.flash(req, 'error', 'صدور صورتحساب ناموفق بود؛ بازیکن و مبلغ را بررسی کنید.');
    } else {
      this.flash(req, 'success', 'صورتحساب صادر شد و برای ولی و بازیکن اعلان ارسال گردید.');
    }
    this.redirect(res, '/admin/invoices');
  }

  /** POST /admin/invoices/:id/cancel — لغو صورتحساب پرداخت‌نشده */
  @Post('/invoices/:id/cancel')
  @Roles('super_admin')
  async cancelInvoice(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'درخواست نامعتبر است.');
      this.redirect(res, '/admin/invoices');
      return;
    }

    const done = await this.payments.cancelInvoice(Number(id));
    this.flash(
      req,
      done ? 'success' : 'error',
      done ? 'صورتحساب لغو شد.' : 'صورتحساب پرداخت‌شده را نمی‌توان لغو کرد.',
    );
    this.redirect(res, '/admin/invoices');
  }

  /** GET /admin/payments — تراکنش‌های درگاه */
  @Get('/payments')
  @Permissions('view_payment_transactions', 'view_financial_reports')
  async transactions(@Req() req: Request, @Res() res: Response): Promise<void> {
    const rows = await this.payments.recentTransactions(200);

    const statusTotals = await this.db.query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
       FROM fc_payment_transactions GROUP BY status`,
    );

    this.render(req, res, 'admin/payments', {
      title: 'تراکنش‌های درگاه پرداخت',
      rows,
      status_totals: statusTotals,
      statuses: PAYMENT_TRANSACTION_STATUSES,
      status_icons: PAYMENT_TRANSACTION_ICONS,
      ...this.gatewayChrome(),
    });
  }
}
