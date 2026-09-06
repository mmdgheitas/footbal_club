import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Roles } from '../../common/decorators/permissions.decorator';
import { getSessionPlayerId } from '../../common/session/session.types';
import { NotificationService } from '../domain/notification.service';
import { PlayerDevelopmentService } from '../domain/player-development.service';
import { TrainingService } from '../domain/training.service';
import { MembershipCardService } from '../domain/membership-card.service';
import { LedgerService } from '../domain/ledger.service';
import { DebtNotifierService } from '../domain/debt-notifier.service';
import { GuardianPanelService } from '../guardian/guardian-panel.service';
import { NotificationAudience, RegistrationStatus } from '../../database/entities';
import {
  MATCH_TYPES,
  PERFORMANCE_TYPES,
  PLAYER_POSITIONS,
  PREFERRED_FEET,
} from '../../config/constants';

/**
 * اپ بازیکن — a mobile-first app with the four big buttons required by the
 * brief pinned to the bottom of the screen:
 *
 *   ⚽ تمرینات   🏆 افتخارات   📋 گزارش‌ها   👤 پروفایل
 *
 * Each tab is a route of its own (/app/trainings, /app/trophies, /app/reports,
 * /app/profile) so the tab bar works without any JavaScript.
 */
@Controller('/app')
@Roles('player')
export class PlayerAppController extends BaseController {
  protected layout = 'layouts/player';

  constructor(
    private readonly notifications: NotificationService,
    private readonly development: PlayerDevelopmentService,
    private readonly trainings: TrainingService,
    private readonly cards: MembershipCardService,
    private readonly ledger: LedgerService,
    private readonly debts: DebtNotifierService,
    private readonly reads: GuardianPanelService,
  ) {
    super();
  }

  /**
   * Every tab starts here: resolve the player, refuse anything that is not an
   * approved registration, and load the chrome (unread badge, active tab).
   */
  private async resolve(
    req: Request,
    res: Response,
    tab: string,
  ): Promise<{ playerId: number; player: any; chrome: Record<string, unknown> } | null> {
    const playerId = getSessionPlayerId(req);
    if (!playerId) {
      this.render(req, res, 'player_panel/no_link', { title: 'خطا' });
      return null;
    }

    const player = await this.reads.playerDetail(playerId);
    if (!player) {
      this.render(req, res, 'player_panel/no_link', { title: 'خطا' });
      return null;
    }

    if (player.registration_status !== RegistrationStatus.APPROVED) {
      this.render(req, res, 'player_app/pending', {
        title: 'وضعیت ثبت‌نام',
        player,
        active_tab: tab,
        unread_count: 0,
      });
      return null;
    }

    const unread = await this.notifications.unreadCount(NotificationAudience.PLAYER, playerId);
    return {
      playerId,
      player,
      chrome: { player, active_tab: tab, unread_count: unread },
    };
  }

  /** GET /app — نوار پایین روی تب تمرینات باز می‌شود */
  @Get()
  index(@Req() req: Request, @Res() res: Response): void {
    return this.redirect(res, '/app/trainings');
  }

  // ------------------------------------------------------------- تمرینات

  /** GET /app/trainings — لیست جلسات تمرین + تاریخ جلسات بعدی */
  @Get('/trainings')
  async trainingsTab(@Req() req: Request, @Res() res: Response): Promise<void> {
    const ctx = await this.resolve(req, res, 'trainings');
    if (!ctx) return;

    const classroomId = ctx.player.classroom_id ?? null;
    const [upcoming, past, attendance] = await Promise.all([
      this.trainings.upcoming(classroomId, 8),
      this.trainings.past(classroomId, 12),
      this.reads.attendanceOf(ctx.playerId, 12),
    ]);

    return this.render(req, res, 'player_app/trainings', {
      ...ctx.chrome,
      title: 'تمرینات',
      upcoming,
      past,
      attendance,
    });
  }

  // ------------------------------------------------------------ افتخارات

  /** GET /app/trophies — نشان‌ها، مدال‌ها، رتبه‌بندی و اطلاعات فنی */
  @Get('/trophies')
  async trophiesTab(@Req() req: Request, @Res() res: Response): Promise<void> {
    const ctx = await this.resolve(req, res, 'trophies');
    if (!ctx) return;

    const [badges, rank, leaderboard, scores, achievements] = await Promise.all([
      this.development.badgesOf(ctx.playerId),
      this.development.rankOf(ctx.playerId),
      this.development.leaderboard(10),
      this.development.scoreHistory(ctx.playerId, 10),
      this.reads.playerDetail(ctx.playerId),
    ]);

    return this.render(req, res, 'player_app/trophies', {
      ...ctx.chrome,
      title: 'افتخارات',
      badges,
      rank,
      leaderboard,
      scores,
      achievements,
      positions: PLAYER_POSITIONS,
      feet: PREFERRED_FEET,
    });
  }

  // ------------------------------------------------------------ گزارش‌ها

  /** GET /app/reports — بازخورد مربی + عملکردهای ثبت‌شده */
  @Get('/reports')
  async reportsTab(@Req() req: Request, @Res() res: Response): Promise<void> {
    const ctx = await this.resolve(req, res, 'reports');
    if (!ctx) return;

    const [performance, summary, feedback, attendance] = await Promise.all([
      this.development.performanceHistory(ctx.playerId, 40),
      this.development.performanceSummary(ctx.playerId),
      this.development.feedbackFor(ctx.playerId, 10),
      this.reads.attendanceOf(ctx.playerId, 10),
    ]);

    return this.render(req, res, 'player_app/reports', {
      ...ctx.chrome,
      title: 'گزارش‌ها',
      performance,
      summary,
      feedback,
      attendance,
      performance_types: PERFORMANCE_TYPES,
      match_types: MATCH_TYPES,
    });
  }

  // ------------------------------------------------------------- پروفایل

  /** GET /app/profile — کارت بازی FIFA + اطلاعات اولیه + کارت عضویت */
  @Get('/profile')
  async profileTab(@Req() req: Request, @Res() res: Response): Promise<void> {
    const ctx = await this.resolve(req, res, 'profile');
    if (!ctx) return;

    await this.debts.syncPlayer(ctx.playerId);

    const [card, attributes, overall, badges, ledger, rank] = await Promise.all([
      this.cards.findActiveFor(ctx.playerId),
      this.development.fifaAttributes(ctx.playerId),
      this.development.fifaOverall(ctx.playerId),
      this.development.badgesOf(ctx.playerId),
      this.ledger.playerLedger(ctx.playerId),
      this.development.rankOf(ctx.playerId),
    ]);

    return this.render(req, res, 'player_app/profile', {
      ...ctx.chrome,
      title: 'پروفایل',
      card,
      attributes,
      overall,
      badges,
      ledger,
      rank,
      positions: PLAYER_POSITIONS,
      feet: PREFERRED_FEET,
    });
  }

  // ---------------------------------------------------------- اعلان‌ها

  /** GET /app/notifications */
  @Get('/notifications')
  async notificationsTab(@Req() req: Request, @Res() res: Response): Promise<void> {
    const ctx = await this.resolve(req, res, 'notifications');
    if (!ctx) return;

    const notifications = await this.notifications.list(
      NotificationAudience.PLAYER,
      ctx.playerId,
    );

    return this.render(req, res, 'player_app/notifications', {
      ...ctx.chrome,
      title: 'اعلان‌ها',
      notifications,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /app/notifications/:id/read */
  @Post('/notifications/:id/read')
  async markRead(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    const playerId = getSessionPlayerId(req);
    if (!playerId || !this.validateCsrf(req)) {
      return this.redirect(res, '/app/notifications');
    }
    await this.notifications.markRead(parseInt(id, 10), NotificationAudience.PLAYER, playerId);
    return this.redirect(res, '/app/notifications');
  }

  /** POST /app/notifications/read-all */
  @Post('/notifications/read-all')
  async markAllRead(@Req() req: Request, @Res() res: Response): Promise<void> {
    const playerId = getSessionPlayerId(req);
    if (!playerId || !this.validateCsrf(req)) {
      return this.redirect(res, '/app/notifications');
    }
    await this.notifications.markAllRead(NotificationAudience.PLAYER, playerId);
    return this.redirect(res, '/app/notifications');
  }
}
