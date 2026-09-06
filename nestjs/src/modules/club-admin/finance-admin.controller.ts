import { Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Permissions, Roles } from '../../common/decorators/permissions.decorator';
import { ExpenseService } from '../domain/expense.service';
import { LedgerService } from '../domain/ledger.service';
import { DebtNotifierService } from '../domain/debt-notifier.service';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_ICONS } from '../../config/constants';

/**
 * گزارش‌های مالی کامل مدیر ارشد: درآمد ماهانه و سه‌ماهه، هزینه‌های دستی،
 * سود/زیان تقریبی و فهرست بدهکاران — plus the manual expense book itself.
 */
@Controller('/admin')
export class FinanceAdminController extends BaseController {
  constructor(
    private readonly expenses: ExpenseService,
    private readonly ledger: LedgerService,
    private readonly debts: DebtNotifierService,
  ) {
    super();
  }

  // ------------------------------------------------------------- هزینه‌ها

  /** GET /admin/expenses — دفتر هزینه‌های باشگاه */
  @Get('/expenses')
  @Roles('super_admin')
  async index(
    @Req() req: Request,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('category') category?: string,
  ): Promise<void> {
    const [rows, totals] = await Promise.all([
      this.expenses.list({ from, to, category }),
      this.expenses.totals(from, to),
    ]);

    return this.render(req, res, 'admin/expenses', {
      title: 'هزینه‌های باشگاه',
      rows,
      totals,
      categories: EXPENSE_CATEGORIES,
      category_icons: EXPENSE_CATEGORY_ICONS,
      filters: { from: from ?? '', to: to ?? '', category: category ?? '' },
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/expenses — ثبت دستی هزینه */
  @Post('/expenses')
  @Roles('super_admin')
  async create(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/expenses');

    const title = String(this.post(req, 'title') ?? '').trim();
    const amount = Number(String(this.post(req, 'amount') ?? '0').replace(/[^\d.]/g, ''));
    const category = String(this.post(req, 'category') ?? 'other');
    const expenseDate = String(this.post(req, 'expense_date') ?? '').trim();
    const note = String(this.post(req, 'note') ?? '').trim() || null;

    if (!title || !amount || !expenseDate) {
      this.flash(req, 'error', 'عنوان، مبلغ و تاریخ هزینه الزامی است.');
      return this.redirect(res, '/admin/expenses');
    }
    if (!Object.prototype.hasOwnProperty.call(EXPENSE_CATEGORIES, category)) {
      this.flash(req, 'error', 'دسته‌بندی هزینه معتبر نیست.');
      return this.redirect(res, '/admin/expenses');
    }

    await this.expenses.create({
      title,
      amount,
      category,
      expenseDate,
      note,
      recordedBy: this.getUserId(req),
    });

    this.flash(req, 'success', 'هزینه ثبت شد.');
    return this.redirect(res, '/admin/expenses');
  }

  /** POST /admin/expenses/:id/delete */
  @Post('/expenses/:id/delete')
  @Roles('super_admin')
  async remove(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/expenses');
    await this.expenses.remove(parseInt(id, 10));
    this.flash(req, 'success', 'هزینه حذف شد.');
    return this.redirect(res, '/admin/expenses');
  }

  // -------------------------------------------------------- گزارش‌های مالی

  /** GET /admin/reports/financial */
  @Get('/reports/financial')
  @Permissions('view_financial_reports', 'view_reports')
  async financialReport(
    @Req() req: Request,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<void> {
    const [monthly, quarterly, profit, debtors, expenseTotals, outstanding] = await Promise.all([
      this.ledger.incomeByMonth(12),
      this.ledger.incomeByQuarter(),
      this.ledger.profitAndLoss(from, to),
      this.ledger.debtors(),
      this.expenses.totals(from, to),
      this.ledger.totalOutstanding(),
    ]);

    return this.render(req, res, 'admin/financial_report', {
      title: 'گزارش مالی جامع',
      monthly,
      quarterly,
      profit,
      debtors,
      expense_totals: expenseTotals,
      outstanding,
      categories: EXPENSE_CATEGORIES,
      category_icons: EXPENSE_CATEGORY_ICONS,
      filters: { from: from ?? '', to: to ?? '' },
      csrf_token: this.generateCsrf(req),
    });
  }

  /** GET /admin/reports/debtors — فهرست بدهکاران */
  @Get('/reports/debtors')
  @Permissions('view_debts', 'view_financial_reports', 'view_reports')
  async debtorsReport(@Req() req: Request, @Res() res: Response): Promise<void> {
    const debtors = await this.ledger.debtors();
    return this.render(req, res, 'admin/debtors_report', {
      title: 'بدهکاران',
      debtors,
      total: debtors.reduce((sum, d) => sum + d.total_debt, 0),
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/reports/debtors/notify — ارسال اعلان درون‌پنلی بدهی */
  @Post('/reports/debtors/notify')
  @Roles('super_admin', 'accountant')
  async notifyDebtors(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/reports/debtors');
    const count = await this.debts.syncAll();
    this.flash(req, 'success', `اعلان بدهی برای ${count} پرونده ارسال شد.`);
    return this.redirect(res, '/admin/reports/debtors');
  }
}
