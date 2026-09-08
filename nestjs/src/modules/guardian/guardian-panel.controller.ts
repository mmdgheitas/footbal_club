import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Roles } from '../../common/decorators/permissions.decorator';
import { getSessionGuardianId } from '../../common/session/session.types';
import { GuardianService } from '../domain/guardian.service';
import { LedgerService } from '../domain/ledger.service';
import { NotificationService } from '../domain/notification.service';
import { DebtNotifierService } from '../domain/debt-notifier.service';
import { MembershipCardService } from '../domain/membership-card.service';
import { PlayerDevelopmentService } from '../domain/player-development.service';
import { TrainingService } from '../domain/training.service';
import { GuardianPanelService } from './guardian-panel.service';
import { PaymentService } from '../payments/payment.service';
import { PaymentGatewayFactory } from '../payments/gateways/payment-gateway.factory';
import { NotificationAudience } from '../../database/entities';
import { REGISTRATION_STATUSES } from '../../config/constants';

/**
 * پنل ولی — a panel of its own, completely separate from the staff dashboard.
 *
 * Everything is scoped by `fc_player_guardians`: a guardian can only ever load
 * data for a player that is linked to their own account (`assertOwns`).
 *
 * Covers the whole brief: وضعیت ثبت‌نام فرزندان، دفترچه مالی شفاف + بدهی،
 * حضور و غیاب، کارت عضویت دیجیتال، اعلان‌ها، گزارش عملکرد و امتیاز و نشان‌ها.
 */
@Controller('/guardian')
@Roles('guardian')
export class GuardianPanelController extends BaseController {
  protected layout = 'layouts/guardian';

  constructor(
    private readonly guardians: GuardianService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationService,
    private readonly debts: DebtNotifierService,
    private readonly cards: MembershipCardService,
    private readonly development: PlayerDevelopmentService,
    private readonly trainings: TrainingService,
    private readonly panel: GuardianPanelService,
    private readonly payments: PaymentService,
    private readonly gateways: PaymentGatewayFactory,
  ) {
    super();
  }

  private guardianId(req: Request): number | null {
    return getSessionGuardianId(req);
  }

  /** Shared locals: children list + unread badge for the layout. */
  private async chrome(guardianId: number): Promise<Record<string, unknown>> {
    const [children, unread] = await Promise.all([
      this.guardians.playersOf(guardianId),
      this.notifications.unreadCount(NotificationAudience.GUARDIAN, guardianId),
    ]);
    return { children, unread_count: unread, registration_labels: REGISTRATION_STATUSES };
  }

  /** GET /guardian — داشبورد ولی */
  @Get()
  async index(@Req() req: Request, @Res() res: Response): Promise<void> {
    const guardianId = this.guardianId(req);
    if (!guardianId) {
      return this.redirect(res, '/login');
    }

    // Refresh the smart in-panel debt reminder on every visit.
    await this.debts.syncGuardian(guardianId);

    const chrome = await this.chrome(guardianId);
    const children = chrome.children as any[];
    const playerIds = children.map((c) => c.id);

    const [finance, notifications, summaries] = await Promise.all([
      this.ledger.guardianLedger(playerIds),
      this.notifications.list(NotificationAudience.GUARDIAN, guardianId, 5),
      this.panel.childSummaries(playerIds),
    ]);

    return this.render(req, res, 'guardian/index', {
      ...chrome,
      title: 'پنل ولی',
      finance,
      notifications,
      summaries,
    });
  }

  /** GET /guardian/player/:id — پرونده کامل یک فرزند */
  @Get('/player/:id')
  async player(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    const guardianId = this.guardianId(req);
    if (!guardianId) return this.redirect(res, '/login');

    const playerId = parseInt(id, 10);
    if (!(await this.guardians.owns(guardianId, playerId))) {
      return this.redirect(res, '/403');
    }

    const chrome = await this.chrome(guardianId);
    const [detail, ledger, scores, badges, performance, summary, attendance, card, rank] =
      await Promise.all([
        this.panel.playerDetail(playerId),
        this.ledger.playerLedger(playerId),
        this.development.scoreHistory(playerId, 20),
        this.development.badgesOf(playerId),
        this.development.performanceHistory(playerId, 20),
        this.development.performanceSummary(playerId),
        this.panel.attendanceOf(playerId),
        this.cards.findActiveFor(playerId),
        this.development.rankOf(playerId),
      ]);

    return this.render(req, res, 'guardian/player', {
      ...chrome,
      title: `پرونده ${detail?.name ?? 'بازیکن'}`,
      player: detail,
      ledger,
      scores,
      badges,
      performance,
      summary,
      attendance,
      card,
      rank,
    });
  }

  /** GET /guardian/financial — دفترچه مالی شفاف */
  @Get('/financial')
  async financial(@Req() req: Request, @Res() res: Response): Promise<void> {
    const guardianId = this.guardianId(req);
    if (!guardianId) return this.redirect(res, '/login');

    await this.debts.syncGuardian(guardianId);

    const chrome = await this.chrome(guardianId);
    const playerIds = (chrome.children as any[]).map((c) => c.id);
    const [finance, payable] = await Promise.all([
      this.ledger.guardianLedger(playerIds),
      this.payments.payableForGuardian(guardianId),
    ]);

    return this.render(req, res, 'guardian/financial', {
      ...chrome,
      title: 'دفترچه مالی',
      finance,
      // پرداخت آنلاین — one button per open invoice.
      payable,
      gateway_test_mode: this.gateways.current().isTestMode,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** GET /guardian/attendance — حضور و غیاب فرزندان */
  @Get('/attendance')
  async attendance(@Req() req: Request, @Res() res: Response): Promise<void> {
    const guardianId = this.guardianId(req);
    if (!guardianId) return this.redirect(res, '/login');

    const chrome = await this.chrome(guardianId);
    const children = chrome.children as any[];

    const records: Array<Record<string, unknown>> = [];
    for (const child of children) {
      records.push({
        player: child,
        attendance: await this.panel.attendanceOf(child.id),
        upcoming: await this.trainings.upcoming(child.classroom_id ?? child.classroomId ?? null, 3),
      });
    }

    return this.render(req, res, 'guardian/attendance', {
      ...chrome,
      title: 'حضور و غیاب',
      records,
    });
  }

  /** GET /guardian/cards — کارت عضویت فرزندان */
  @Get('/cards')
  async cardsPage(@Req() req: Request, @Res() res: Response): Promise<void> {
    const guardianId = this.guardianId(req);
    if (!guardianId) return this.redirect(res, '/login');

    const chrome = await this.chrome(guardianId);
    const children = chrome.children as any[];

    const cards: Array<Record<string, unknown>> = [];
    for (const child of children) {
      cards.push({ player: child, card: await this.cards.findActiveFor(child.id) });
    }

    return this.render(req, res, 'guardian/cards', {
      ...chrome,
      title: 'کارت عضویت',
      cards,
    });
  }

  /** GET /guardian/notifications — اعلان‌های درون‌پنلی */
  @Get('/notifications')
  async notificationsPage(@Req() req: Request, @Res() res: Response): Promise<void> {
    const guardianId = this.guardianId(req);
    if (!guardianId) return this.redirect(res, '/login');

    const chrome = await this.chrome(guardianId);
    const notifications = await this.notifications.list(
      NotificationAudience.GUARDIAN,
      guardianId,
    );

    return this.render(req, res, 'guardian/notifications', {
      ...chrome,
      title: 'اعلان‌ها',
      notifications,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /guardian/notifications/:id/read */
  @Post('/notifications/:id/read')
  async markRead(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    const guardianId = this.guardianId(req);
    if (!guardianId) return this.redirect(res, '/login');
    if (!this.validateCsrf(req)) {
      return this.redirect(res, '/guardian/notifications');
    }
    await this.notifications.markRead(
      parseInt(id, 10),
      NotificationAudience.GUARDIAN,
      guardianId,
    );
    return this.redirect(res, '/guardian/notifications');
  }

  /** POST /guardian/notifications/read-all */
  @Post('/notifications/read-all')
  async markAllRead(@Req() req: Request, @Res() res: Response): Promise<void> {
    const guardianId = this.guardianId(req);
    if (!guardianId) return this.redirect(res, '/login');
    if (!this.validateCsrf(req)) {
      return this.redirect(res, '/guardian/notifications');
    }
    await this.notifications.markAllRead(NotificationAudience.GUARDIAN, guardianId);
    this.flash(req, 'success', 'همه اعلان‌ها خوانده‌شده علامت خوردند.');
    return this.redirect(res, '/guardian/notifications');
  }
}
