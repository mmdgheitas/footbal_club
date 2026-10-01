import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { RbacService } from '../../common/rbac/rbac.service';
import { FinancialService } from './financial.service';
import { DashboardService } from '../dashboard/dashboard.service';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** PHP number_format($n, 2): thousands separator ",", decimal point ".". */
function numberFormat(n: number): string {
  const fixed = Math.abs(n).toFixed(2);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}${grouped}.${dec}`;
}

/** PHP date('d M Y, H:i', strtotime(...)). */
function displayDateTime(value: string): string {
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

/**
 * Port of app/Controllers/FinancialController.php (5 routes).
 */
@Controller()
export class FinancialController extends BaseController {
  constructor(
    private readonly financial: FinancialService,
    private readonly dashboard: DashboardService,
  ) {
    super();
  }

  /** GET /payments - RbacMiddleware::requirePermission('view_payments') */
  @Get('/payments')
  @Permissions('view_payments')
  async index(@Req() req: Request, @Res() res: Response) {
    const page = parseInt(String(this.query(req, 'page') ?? 1), 10) || 0;

    const [payments, playersList, financialItems] = await Promise.all([
      this.financial.listPayments(page),
      this.financial.listSelectablePlayers(),
      this.financial.listFinancialItems(true),
    ]);

    return this.render(req, res, 'financial/index', {
      title: 'مالی',
      payments,
      players_list: playersList,
      financial_items: financialItems,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /payment/record - RbacMiddleware::requirePermission('record_payment') */
  @Post('/payment/record')
  @Permissions('record_payment')
  async record(@Req() req: Request, @Res() res: Response) {
    if (req.method !== 'POST') {
      return this.json(res, { error: 'روش درخواست مجاز نیست.' }, 405);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'نشست شما منقضی شده است؛ صفحه را تازه کنید.' }, 403);
    }

    const playerId = parseInt(String(this.post(req, 'player_id') ?? 0), 10) || 0;
    const amount = parseFloat(String(this.post(req, 'amount') ?? 0).replace(/,/g, '')) || 0;
    const description = SecurityHelper.sanitizeString(
      this.post(req, 'description') ?? '',
    );
    const paymentMethod = SecurityHelper.sanitizeString(
      this.post(req, 'payment_method') ?? '',
    );

    if (playerId === 0) {
      return this.json(res, { error: 'انتخاب بازیکن الزامی است.' }, 422);
    }

    if (amount <= 0) {
      return this.json(res, { error: 'مبلغ باید بیشتر از صفر باشد.' }, 422);
    }

    const rawItemIds = (req.body as any)?.financial_item_ids ?? (req.body as any)?.['financial_item_ids[]'] ?? [];
    const selectedItemIds = (Array.isArray(rawItemIds) ? rawItemIds : [rawItemIds])
      .map((value: unknown) => parseInt(String(value), 10))
      .filter((value: number) => Number.isInteger(value) && value > 0);

    const paymentId = await this.financial.recordPayment({
      player_id: playerId,
      amount,
      description,
      payment_method: paymentMethod,
      status: 'completed',
      reference_number: `REF-${Math.floor(Date.now() / 1000)}-${Math.floor(
        Math.random() * 9000,
      ) + 1000}`,
    }, selectedItemIds);

    if (!paymentId) {
      return this.json(res, { error: 'ثبت پرداخت انجام نشد.' }, 500);
    }

    return this.json(res, { success: true, payment_id: paymentId });
  }

  @Get('/admin/financial-items')
  @Permissions('manage_payments')
  async financialItems(@Req() req: Request, @Res() res: Response) {
    return this.render(req, res, 'financial/items', {
      title: 'مدیریت اقلام مالی',
      items: await this.financial.listFinancialItems(),
      csrf_token: this.generateCsrf(req),
    });
  }

  @Post('/admin/financial-items/save')
  @Permissions('manage_payments')
  async saveFinancialItem(@Req() req: Request, @Res() res: Response) {
    if (!this.validateCsrf(req)) return this.json(res, { error: 'نشست شما منقضی شده است؛ صفحه را تازه کنید.' }, 403);
    const id = parseInt(String(this.post(req, 'id') ?? 0), 10) || null;
    const name = SecurityHelper.sanitizeString(this.post(req, 'name') ?? '').trim();
    const price = Number(String(this.post(req, 'price') ?? '0').replace(/,/g, ''));
    const quantity = parseInt(String(this.post(req, 'quantity') ?? 1).replace(/,/g, ''), 10);
    if (!name) return this.json(res, { error: 'نام قلم الزامی است.' }, 422);
    if (!Number.isFinite(price) || price < 0) return this.json(res, { error: 'قیمت واردشده معتبر نیست.' }, 422);
    if (!Number.isInteger(quantity) || quantity < 1) return this.json(res, { error: 'تعداد باید دست‌کم یک باشد.' }, 422);
    try {
      const ok = await this.financial.saveFinancialItem(id, { name, price, quantity, isActive: this.post(req, 'is_active') === '1' });
      return this.respond(req, res, {
        ok, message: ok ? 'قلم مالی با موفقیت ذخیره شد.' : 'ذخیره قلم مالی انجام نشد.',
        redirect: '/admin/financial-items', status: ok ? 200 : 500,
      });
    } catch {
      return this.json(res, { error: 'نام قلم تکراری است یا اطلاعات معتبر نیست.' }, 422);
    }
  }

  @Post('/admin/financial-items/delete/:id')
  @Permissions('manage_payments')
  async deleteFinancialItem(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.validateCsrf(req)) return this.json(res, { error: 'نشست شما منقضی شده است؛ صفحه را تازه کنید.' }, 403);
    const ok = await this.financial.deleteFinancialItem(parseInt(id, 10));
    return this.respond(req, res, {
      ok, message: ok ? 'قلم مالی حذف شد؛ سوابق رسیدها محفوظ است.' : 'حذف قلم مالی انجام نشد.',
      redirect: '/admin/financial-items', status: ok ? 200 : 404,
    });
  }

  /**
   * GET /payment/receipt/:id - authenticated, but the permission check is
   * inline in the legacy code: players may only view their own receipt,
   * everyone else needs view_payments.
   */
  @Get('/payment/receipt/:id')
  async generateReceipt(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    const paymentId = parseInt(id, 10);
    const payment = await this.financial.findPaymentWithPlayer(paymentId);

    if (payment === null) {
      return this.json(res, { error: 'پرداخت یافت نشد.' }, 404);
    }

    const userRole = this.getUserRole(req);
    const user: any = this.getUser(req);
    if (userRole === 'player') {
      if (parseInt(payment.player_id, 10) !== parseInt(user?.player_id ?? 0, 10)) {
        return this.redirect(res, '/403');
      }
    } else if (!RbacService.hasPermission('view_payments', userRole)) {
      // RbacMiddleware::requirePermission() renders the 403 page.
      return this.renderStandalone(
        req,
        res,
        'errors/403',
        {
          title: 'دسترسی غیرمجاز',
          code: 403,
          message: 'شما مجوز انجام این عملیات را ندارید.',
        },
        403,
      );
    }

    // Legacy sends raw HTML with no layout.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(this.generateReceiptHtml(payment));
  }

  /** FinancialController::generateReceiptHtml() - identical markup. */
  private generateReceiptHtml(payment: any): string {
    const amount = numberFormat(parseFloat(payment.amount));
    const date = displayDateTime(payment.created_at);
    const playerName = SecurityHelper.escape(payment.player_name ?? '-');
    const description = SecurityHelper.escape(payment.description ?? '-');
    const reference = SecurityHelper.escape(payment.reference_number);

    return `        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>رسید پرداخت ${reference}</title>
            <style>
                body { font-family: Vazirmatn, Tahoma, sans-serif; direction: rtl; margin: 20px; }
                .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h2 { margin: 0; }
                .details { margin: 20px 0; }
                .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .row label { font-weight: bold; }
                .total { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin: 20px 0; padding: 10px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>رسید پرداخت</h2>
                    <p>شماره پیگیری: ${reference}</p>
                </div>
                <div class="details">
                    <div class="row">
                        <label>نام بازیکن:</label>
                        <span>${playerName}</span>
                    </div>
                    <div class="row">
                        <label>مبلغ:</label>
                        <span>${amount}</span>
                    </div>
                    <div class="row">
                        <label>توضیحات:</label>
                        <span>${description}</span>
                    </div>
                    <div class="row">
                        <label>تاریخ پرداخت:</label>
                        <span>${date}</span>
                    </div>
                    <div class="row">
                        <label>وضعیت:</label>
                        <span>تکمیل‌شده</span>
                    </div>
                </div>
                <div class="footer">
                    <p>از پرداخت شما سپاسگزاریم.</p>
                </div>
            </div>
        </body>
        </html>
        `;
  }

  /** GET /reports/financial - RbacMiddleware::requirePermission('generate_reports') */
  @Get('/reports/financial')
  @Permissions('generate_reports')
  async report(@Req() req: Request, @Res() res: Response) {
    const year =
      parseInt(String(this.query(req, 'year') ?? ''), 10) || new Date().getFullYear();
    const yearlyRevenue = await this.dashboard.getYearlyRevenue(year);

    return this.render(req, res, 'financial/report', {
      title: 'گزارش مالی',
      year,
      yearly_revenue: yearlyRevenue,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** GET /reports/debts - RbacMiddleware::requirePermission('view_debts') */
  @Get('/reports/debts')
  @Permissions('view_debts')
  async debtReport(@Req() req: Request, @Res() res: Response) {
    const debts = await this.dashboard.getDebtsReport();

    return this.render(req, res, 'financial/debts', {
      title: 'بدهی‌های معوق',
      debts,
      total_outstanding: debts.reduce(
        (sum: number, item: any) => sum + Number(item.total_outstanding ?? 0),
        0,
      ),
    });
  }
}
