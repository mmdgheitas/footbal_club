import { Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Roles } from '../../common/decorators/permissions.decorator';
import { RegistrationService } from '../domain/registration.service';
import { MembershipCardService } from '../domain/membership-card.service';
import { PlayerDevelopmentService } from '../domain/player-development.service';
import { GuardianService } from '../domain/guardian.service';
import { TrainingService } from '../domain/training.service';
import { NotificationService } from '../domain/notification.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Classroom,
  NotificationAudience,
  NotificationType,
  Player,
  RegistrationStatus,
} from '../../database/entities';
import {
  BADGES,
  PERFORMANCE_TYPES,
  PLAYER_POSITIONS,
  PREFERRED_FEET,
  REGISTRATION_STATUSES,
} from '../../config/constants';

/**
 * مدیریت ارشد باشگاه — the super-admin-only surfaces of the expansion:
 * تأیید ثبت‌نام، صدور کارت عضویت، نشان‌ها، امتیازدهی، ولی‌ها و جلسات تمرین.
 *
 * Everything here is @Roles('super_admin'); a coach cannot reach any of it.
 */
@Controller('/admin')
@Roles('super_admin')
export class ClubAdminController extends BaseController {
  constructor(
    private readonly registrations: RegistrationService,
    private readonly cards: MembershipCardService,
    private readonly development: PlayerDevelopmentService,
    private readonly guardians: GuardianService,
    private readonly trainings: TrainingService,
    private readonly notifications: NotificationService,
    @InjectRepository(Player) private readonly players: Repository<Player>,
    @InjectRepository(Classroom) private readonly classrooms: Repository<Classroom>,
  ) {
    super();
  }

  // ------------------------------------------------------------ ثبت‌نام‌ها

  /** GET /admin/registrations */
  @Get('/registrations')
  async registrationsPage(
    @Req() req: Request,
    @Res() res: Response,
    @Query('status') status?: string,
  ): Promise<void> {
    const [rows, counts] = await Promise.all([
      this.registrations.list(status || undefined),
      this.registrations.counts(),
    ]);

    return this.render(req, res, 'admin/registrations', {
      title: 'مدیریت ثبت‌نام‌ها',
      rows,
      counts,
      selected_status: status ?? '',
      statuses: REGISTRATION_STATUSES,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/registrations/:id/approve — تأیید + صدور خودکار کارت */
  @Post('/registrations/:id/approve')
  async approve(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است.');
      return this.redirect(res, '/admin/registrations');
    }

    const result = await this.registrations.approve(parseInt(id, 10), this.getUserId(req));
    if (!result) {
      this.flash(req, 'error', 'بازیکن یافت نشد.');
      return this.redirect(res, '/admin/registrations');
    }

    this.flash(
      req,
      'success',
      `ثبت‌نام ${result.player.name} تأیید شد و کارت عضویت ${result.card?.cardNumber ?? ''} صادر گردید.`,
    );
    return this.redirect(res, '/admin/registrations');
  }

  /** POST /admin/registrations/:id/incomplete */
  @Post('/registrations/:id/incomplete')
  async incomplete(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است.');
      return this.redirect(res, '/admin/registrations');
    }

    const reason = String(this.post(req, 'reason') ?? '').trim() || 'مدارک ناقص است.';
    await this.registrations.markIncomplete(parseInt(id, 10), reason, this.getUserId(req));

    this.flash(req, 'success', 'وضعیت ثبت‌نام به «ناقص» تغییر کرد و به ولی اطلاع داده شد.');
    return this.redirect(res, '/admin/registrations');
  }

  // -------------------------------------------------------- کارت‌های عضویت

  /** GET /admin/cards */
  @Get('/cards')
  async cardsPage(@Req() req: Request, @Res() res: Response): Promise<void> {
    const [cards, approved] = await Promise.all([
      this.cards.list(),
      this.players.find({
        where: { registrationStatus: RegistrationStatus.APPROVED },
        order: { name: 'ASC' },
      }),
    ]);

    const cardsByPlayer = new Map(cards.map((c) => [c.playerId, c]));
    const rows = approved.map((player) => ({
      player,
      card: cardsByPlayer.get(player.id) ?? null,
    }));

    return this.render(req, res, 'admin/cards', {
      title: 'کارت‌های عضویت',
      rows,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/cards/issue/:playerId */
  @Post('/cards/issue/:playerId')
  async issueCard(
    @Req() req: Request,
    @Res() res: Response,
    @Param('playerId') playerId: string,
  ): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/cards');

    const card = await this.cards.issueFor(parseInt(playerId, 10), this.getUserId(req));
    this.flash(
      req,
      card ? 'success' : 'error',
      card ? `کارت ${card.cardNumber} صادر شد.` : 'صدور کارت ناموفق بود.',
    );
    return this.redirect(res, '/admin/cards');
  }

  /** POST /admin/cards/revoke/:id */
  @Post('/cards/revoke/:id')
  async revokeCard(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/cards');
    await this.cards.revoke(parseInt(id, 10));
    this.flash(req, 'success', 'کارت باطل شد.');
    return this.redirect(res, '/admin/cards');
  }

  // ---------------------------------------------------- نشان‌ها و امتیازها

  /** GET /admin/badges — تعیین نشان فقط در این صفحه ممکن است */
  @Get('/badges')
  async badgesPage(
    @Req() req: Request,
    @Res() res: Response,
    @Query('player') playerParam?: string,
  ): Promise<void> {
    const players = await this.players.find({
      where: { registrationStatus: RegistrationStatus.APPROVED },
      order: { name: 'ASC' },
    });

    const playerId = playerParam ? parseInt(playerParam, 10) : players[0]?.id ?? 0;
    const badges = playerId ? await this.development.badgesOf(playerId) : [];

    return this.render(req, res, 'admin/badges', {
      title: 'نشان‌های بازیکنان',
      players,
      selected_player: playerId,
      badges,
      catalog: BADGES,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/badges/assign */
  @Post('/badges/assign')
  async assignBadge(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/badges');

    const playerId = parseInt(String(this.post(req, 'player_id') ?? '0'), 10);
    const badgeKey = String(this.post(req, 'badge_key') ?? '');
    const note = String(this.post(req, 'note') ?? '').trim() || null;

    try {
      const badge = await this.development.assignBadge({
        playerId,
        badgeKey,
        note,
        assignedBy: this.getUserId(req),
        role: this.getUserRole(req),
      });

      await this.notifications.create({
        userType: NotificationAudience.PLAYER,
        userId: playerId,
        title: 'نشان جدید 🏅',
        message: `نشان «${badge.badgeTitle}» به شما اهدا شد.`,
        type: NotificationType.BADGE,
        link: '/app/trophies',
      });

      const guardian = await this.guardians.guardianOfPlayer(playerId);
      if (guardian) {
        await this.notifications.create({
          userType: NotificationAudience.GUARDIAN,
          userId: guardian.id,
          title: 'نشان جدید فرزند شما 🏅',
          message: `نشان «${badge.badgeTitle}» اهدا شد.`,
          type: NotificationType.BADGE,
          link: `/guardian/player/${playerId}`,
        });
      }

      this.flash(req, 'success', 'نشان اهدا شد.');
    } catch (error) {
      this.flash(req, 'error', (error as Error).message);
    }

    return this.redirect(res, `/admin/badges?player=${playerId}`);
  }

  /** POST /admin/badges/remove/:id */
  @Post('/badges/remove/:id')
  async removeBadge(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/badges');
    const playerId = parseInt(String(this.post(req, 'player_id') ?? '0'), 10);
    try {
      await this.development.removeBadge(parseInt(id, 10), this.getUserRole(req));
      this.flash(req, 'success', 'نشان حذف شد.');
    } catch (error) {
      this.flash(req, 'error', (error as Error).message);
    }
    return this.redirect(res, `/admin/badges?player=${playerId}`);
  }

  /** GET /admin/scores — امتیازدهی مدیر ارشد و رتبه‌بندی */
  @Get('/scores')
  async scoresPage(@Req() req: Request, @Res() res: Response): Promise<void> {
    const [players, leaderboard] = await Promise.all([
      this.players.find({
        where: { registrationStatus: RegistrationStatus.APPROVED },
        order: { name: 'ASC' },
      }),
      this.development.leaderboard(50),
    ]);

    return this.render(req, res, 'admin/scores', {
      title: 'امتیازدهی و رتبه‌بندی',
      players,
      leaderboard,
      performance_types: PERFORMANCE_TYPES,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/scores */
  @Post('/scores')
  async addScore(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/scores');

    const playerId = parseInt(String(this.post(req, 'player_id') ?? '0'), 10);
    const points = parseInt(String(this.post(req, 'points') ?? '0'), 10) || 0;
    const reason = String(this.post(req, 'reason') ?? '').trim() || null;

    if (!playerId || points === 0) {
      this.flash(req, 'error', 'بازیکن و مقدار امتیاز الزامی است.');
      return this.redirect(res, '/admin/scores');
    }

    await this.development.addScore({
      playerId,
      points,
      reason,
      sessionDate: null,
      scoredBy: this.getUserId(req),
      role: this.getUserRole(req),
    });

    await this.notifications.create({
      userType: NotificationAudience.PLAYER,
      userId: playerId,
      title: 'امتیاز جدید ⭐',
      message: `${points > 0 ? '+' : ''}${points} امتیاز توسط مدیریت ثبت شد.${reason ? ` (${reason})` : ''}`,
      type: NotificationType.SCORE,
      link: '/app/trophies',
    });

    this.flash(req, 'success', 'امتیاز ثبت شد.');
    return this.redirect(res, '/admin/scores');
  }

  // ----------------------------------------------------------------- ولی‌ها

  /** GET /admin/guardians */
  @Get('/guardians')
  async guardiansPage(@Req() req: Request, @Res() res: Response): Promise<void> {
    const guardians = await this.guardians.list();
    const rows: Array<Record<string, unknown>> = [];
    for (const guardian of guardians) {
      rows.push({ guardian, players: await this.guardians.playersOf(guardian.id) });
    }

    const players = await this.players.find({
      where: {},
      order: { name: 'ASC' },
    });

    return this.render(req, res, 'admin/guardians', {
      title: 'مدیریت ولی‌ها',
      rows,
      players,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/guardians — ایجاد حساب ولی */
  @Post('/guardians')
  async createGuardian(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/guardians');

    const name = String(this.post(req, 'name') ?? '').trim();
    const phone = String(this.post(req, 'phone') ?? '').trim();
    const nationalId = String(this.post(req, 'national_id') ?? '').trim() || null;

    if (!name || !phone) {
      this.flash(req, 'error', 'نام و شماره موبایل الزامی است.');
      return this.redirect(res, '/admin/guardians');
    }

    const guardian = await this.guardians.create({ name, phone, nationalId });
    this.flash(req, 'success', `حساب ولی «${guardian.name}» ایجاد شد.`);
    return this.redirect(res, '/admin/guardians');
  }

  /** POST /admin/guardians/link — اتصال بازیکن به ولی */
  @Post('/guardians/link')
  async linkPlayer(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/guardians');

    const guardianId = parseInt(String(this.post(req, 'guardian_id') ?? '0'), 10);
    const playerId = parseInt(String(this.post(req, 'player_id') ?? '0'), 10);
    const relationship = String(this.post(req, 'relationship') ?? '').trim() || null;

    if (!guardianId || !playerId) {
      this.flash(req, 'error', 'ولی و بازیکن را انتخاب کنید.');
      return this.redirect(res, '/admin/guardians');
    }

    await this.guardians.linkPlayer(guardianId, playerId, relationship);
    this.flash(req, 'success', 'بازیکن به ولی متصل شد.');
    return this.redirect(res, '/admin/guardians');
  }

  /** POST /admin/guardians/unlink/:playerId */
  @Post('/guardians/unlink/:playerId')
  async unlinkPlayer(
    @Req() req: Request,
    @Res() res: Response,
    @Param('playerId') playerId: string,
  ): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/guardians');
    await this.guardians.unlinkPlayer(parseInt(playerId, 10));
    this.flash(req, 'success', 'ارتباط حذف شد.');
    return this.redirect(res, '/admin/guardians');
  }

  // ------------------------------------------------------------ جلسات تمرین

  /** GET /admin/trainings */
  @Get('/trainings')
  async trainingsPage(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this.render(req, res, 'admin/trainings', {
      title: 'جلسات تمرین',
      sessions: await this.trainings.all(),
      classrooms: await this.classrooms.find({ order: { name: 'ASC' } }),
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/trainings */
  @Post('/trainings')
  async createTraining(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/trainings');

    const title = String(this.post(req, 'title') ?? '').trim();
    const sessionDate = String(this.post(req, 'session_date') ?? '').trim();
    if (!title || !sessionDate) {
      this.flash(req, 'error', 'عنوان و تاریخ جلسه الزامی است.');
      return this.redirect(res, '/admin/trainings');
    }

    const classroomId = parseInt(String(this.post(req, 'classroom_id') ?? '0'), 10) || null;

    await this.trainings.create({
      classroomId,
      title,
      sessionDate,
      startTime: String(this.post(req, 'start_time') ?? '').trim() || null,
      location: String(this.post(req, 'location') ?? '').trim() || null,
      notes: String(this.post(req, 'notes') ?? '').trim() || null,
      createdBy: this.getUserId(req),
    });

    // Tell the players of that classroom, in-panel.
    const players = classroomId
      ? await this.players.find({ where: { classroomId } })
      : await this.players.find({ where: { registrationStatus: RegistrationStatus.APPROVED } });

    for (const player of players) {
      await this.notifications.create({
        userType: NotificationAudience.PLAYER,
        userId: player.id,
        title: 'جلسه تمرین جدید ⚽',
        message: `${title} — ${sessionDate}`,
        type: NotificationType.TRAINING,
        link: '/app/trainings',
        dedupeKey: `training:${sessionDate}:${title}:p${player.id}`,
      });
    }

    this.flash(req, 'success', 'جلسه تمرین ثبت شد و به بازیکنان اطلاع داده شد.');
    return this.redirect(res, '/admin/trainings');
  }

  /** POST /admin/trainings/:id/delete */
  @Post('/trainings/:id/delete')
  async deleteTraining(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/admin/trainings');
    await this.trainings.remove(parseInt(id, 10));
    this.flash(req, 'success', 'جلسه حذف شد.');
    return this.redirect(res, '/admin/trainings');
  }

  // ------------------------------------------------------ گزارش عملکرد کلی

  /** GET /admin/reports/performance — گزارش عملکرد بازیکنان */
  @Get('/reports/performance')
  async performanceReport(@Req() req: Request, @Res() res: Response): Promise<void> {
    const leaderboard = await this.development.leaderboard(100);

    const rows: Array<Record<string, unknown>> = [];
    for (const entry of leaderboard) {
      rows.push({
        ...entry,
        summary: await this.development.performanceSummary(entry.id),
        badges: await this.development.badgesOf(entry.id),
      });
    }

    return this.render(req, res, 'admin/performance_report', {
      title: 'گزارش عملکرد بازیکنان',
      rows,
      performance_types: PERFORMANCE_TYPES,
      positions: PLAYER_POSITIONS,
      feet: PREFERRED_FEET,
    });
  }
}
