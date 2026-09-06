import { Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Roles } from '../../common/decorators/permissions.decorator';
import { CoachAccessService } from '../domain/coach-access.service';
import { PlayerDevelopmentService } from '../domain/player-development.service';
import { TrainingService } from '../domain/training.service';
import { NotificationService } from '../domain/notification.service';
import { GuardianService } from '../domain/guardian.service';
import { GuardianPanelService } from '../guardian/guardian-panel.service';
import {
  MATCH_TYPES,
  PERFORMANCE_TYPES,
  PLAYER_POSITIONS,
  PREFERRED_FEET,
} from '../../config/constants';
import { NotificationAudience, NotificationType } from '../../database/entities';

/**
 * پنل مربی — deliberately narrow.
 *
 * A coach may:
 *   ✔ ببیند: فقط بازیکنان تأییدشدهٔ کلاس خودش، اطلاعات فنی آن‌ها و تاریخچهٔ حضور
 *   ✔ ثبت کند: حضور و غیاب، عملکرد (گل/پاس گل/دریبل/…) و امتیاز
 *
 * A coach may NOT:
 *   ✘ تأیید یا رد ثبت‌نام            (super admin only — /admin/registrations)
 *   ✘ حذف یا ویرایش اطلاعات بازیکن   (no write route exists here)
 *   ✘ بازیکنان کلاس‌های دیگر         (CoachAccessService scopes every query)
 *   ✘ اطلاعات مالی                   (no financial data is loaded in this module)
 *   ✘ تعیین نشان                     (PlayerDevelopmentService rejects non-admins)
 */
@Controller('/coach')
@Roles('coach', 'super_admin')
export class CoachController extends BaseController {
  constructor(
    private readonly access: CoachAccessService,
    private readonly development: PlayerDevelopmentService,
    private readonly trainings: TrainingService,
    private readonly notifications: NotificationService,
    private readonly guardians: GuardianService,
    private readonly reads: GuardianPanelService,
  ) {
    super();
  }

  /** GET /coach — کلاس‌ها و بازیکنان تأییدشدهٔ من */
  @Get()
  async index(@Req() req: Request, @Res() res: Response): Promise<void> {
    const userId = this.getUserId(req)!;
    const [classrooms, players] = await Promise.all([
      this.access.classroomsOf(userId),
      this.access.playersOf(userId),
    ]);

    const classroomIds = classrooms.map((c) => c.id);
    const upcoming = await this.trainings.all(classroomIds.length ? classroomIds : null);

    return this.render(req, res, 'coach/index', {
      title: 'پنل مربی',
      classrooms,
      players,
      sessions: upcoming.slice(0, 8),
      positions: PLAYER_POSITIONS,
      feet: PREFERRED_FEET,
    });
  }

  /** GET /coach/players?classroom=ID */
  @Get('/players')
  async players(
    @Req() req: Request,
    @Res() res: Response,
    @Query('classroom') classroom?: string,
  ): Promise<void> {
    const userId = this.getUserId(req)!;
    const classroomId = classroom ? parseInt(classroom, 10) : null;

    const [classrooms, players] = await Promise.all([
      this.access.classroomsOf(userId),
      this.access.playersOf(userId, classroomId),
    ]);

    return this.render(req, res, 'coach/players', {
      title: 'بازیکنان کلاس من',
      classrooms,
      players,
      selected_classroom: classroomId,
      positions: PLAYER_POSITIONS,
      feet: PREFERRED_FEET,
    });
  }

  /** GET /coach/player/:id — پرونده فنی + ثبت عملکرد و امتیاز */
  @Get('/player/:id')
  async player(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);
    const playerId = parseInt(id, 10);

    const player = await this.access.resolvePlayer(role, userId, playerId);
    if (!player) {
      // Out of scope players are indistinguishable from missing ones.
      return this.redirect(res, '/403');
    }

    const [detail, attendance, performance, summary, scores, badges, rank] = await Promise.all([
      this.reads.playerDetail(playerId),
      this.reads.attendanceOf(playerId),
      this.development.performanceHistory(playerId, 25),
      this.development.performanceSummary(playerId),
      this.development.scoreHistory(playerId, 25),
      this.development.badgesOf(playerId),
      this.development.rankOf(playerId),
    ]);

    return this.render(req, res, 'coach/player', {
      title: `پرونده ${player.name}`,
      player: detail,
      attendance,
      performance,
      summary,
      scores,
      badges,
      rank,
      performance_types: PERFORMANCE_TYPES,
      match_types: MATCH_TYPES,
      positions: PLAYER_POSITIONS,
      feet: PREFERRED_FEET,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /coach/player/:id/performance — ثبت عملکرد */
  @Post('/player/:id/performance')
  async recordPerformance(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);
    const playerId = parseInt(id, 10);

    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است.');
      return this.redirect(res, `/coach/player/${playerId}`);
    }

    const player = await this.access.resolvePlayer(role, userId, playerId);
    if (!player) {
      return this.redirect(res, '/403');
    }

    const type = String(this.post(req, 'type') ?? '');
    const value = parseInt(String(this.post(req, 'value') ?? '1'), 10) || 1;
    const description = String(this.post(req, 'description') ?? '').trim() || null;
    const matchType = String(this.post(req, 'match_type') ?? 'training');
    const sessionDate = String(this.post(req, 'session_date') ?? '').trim() || null;
    const withScore = String(this.post(req, 'with_score') ?? '1') === '1';

    try {
      await this.development.recordPerformance({
        playerId,
        type,
        value,
        description,
        matchType,
        sessionDate,
        recordedBy: userId,
        role,
        withScore,
      });
    } catch (error) {
      this.flash(req, 'error', (error as Error).message);
      return this.redirect(res, `/coach/player/${playerId}`);
    }

    await this.notifyPlayerAndGuardian(
      playerId,
      player.name,
      'عملکرد جدید ثبت شد',
      `${PERFORMANCE_TYPES[type]?.label ?? type} برای ${player.name} ثبت شد.`,
      NotificationType.PERFORMANCE,
    );

    this.flash(req, 'success', 'عملکرد بازیکن ثبت شد.');
    return this.redirect(res, `/coach/player/${playerId}`);
  }

  /** POST /coach/player/:id/score — ثبت امتیاز */
  @Post('/player/:id/score')
  async recordScore(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);
    const playerId = parseInt(id, 10);

    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است.');
      return this.redirect(res, `/coach/player/${playerId}`);
    }

    const player = await this.access.resolvePlayer(role, userId, playerId);
    if (!player) {
      return this.redirect(res, '/403');
    }

    const points = parseInt(String(this.post(req, 'points') ?? '0'), 10) || 0;
    const reason = String(this.post(req, 'reason') ?? '').trim() || null;
    const sessionDate = String(this.post(req, 'session_date') ?? '').trim() || null;

    if (points === 0) {
      this.flash(req, 'error', 'مقدار امتیاز نمی‌تواند صفر باشد.');
      return this.redirect(res, `/coach/player/${playerId}`);
    }

    try {
      await this.development.addScore({
        playerId,
        points,
        reason,
        sessionDate,
        scoredBy: userId,
        role,
      });
    } catch (error) {
      this.flash(req, 'error', (error as Error).message);
      return this.redirect(res, `/coach/player/${playerId}`);
    }

    await this.notifyPlayerAndGuardian(
      playerId,
      player.name,
      'امتیاز جدید',
      `${points > 0 ? '+' : ''}${points} امتیاز برای ${player.name} ثبت شد.${reason ? ` (${reason})` : ''}`,
      NotificationType.SCORE,
    );

    this.flash(req, 'success', 'امتیاز ثبت شد.');
    return this.redirect(res, `/coach/player/${playerId}`);
  }

  /** GET /coach/trainings — جلسات تمرین کلاس‌های من */
  @Get('/trainings')
  async trainingsPage(@Req() req: Request, @Res() res: Response): Promise<void> {
    const userId = this.getUserId(req)!;
    const classrooms = await this.access.classroomsOf(userId);
    const ids = classrooms.map((c) => c.id);

    return this.render(req, res, 'coach/trainings', {
      title: 'جلسات تمرین',
      classrooms,
      sessions: await this.trainings.all(ids.length ? ids : null),
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /coach/trainings — افزودن جلسه تمرین برای کلاس خودم */
  @Post('/trainings')
  async createTraining(@Req() req: Request, @Res() res: Response): Promise<void> {
    const userId = this.getUserId(req)!;
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است.');
      return this.redirect(res, '/coach/trainings');
    }

    const classroomId = parseInt(String(this.post(req, 'classroom_id') ?? '0'), 10) || null;
    const ownIds = await this.access.classroomIdsOf(userId);
    if (classroomId !== null && !ownIds.includes(classroomId)) {
      return this.redirect(res, '/403');
    }

    const title = String(this.post(req, 'title') ?? '').trim();
    const sessionDate = String(this.post(req, 'session_date') ?? '').trim();
    if (!title || !sessionDate) {
      this.flash(req, 'error', 'عنوان و تاریخ جلسه الزامی است.');
      return this.redirect(res, '/coach/trainings');
    }

    await this.trainings.create({
      classroomId,
      title,
      sessionDate,
      startTime: String(this.post(req, 'start_time') ?? '').trim() || null,
      location: String(this.post(req, 'location') ?? '').trim() || null,
      notes: String(this.post(req, 'notes') ?? '').trim() || null,
      createdBy: userId,
    });

    this.flash(req, 'success', 'جلسه تمرین ثبت شد.');
    return this.redirect(res, '/coach/trainings');
  }

  /** Sends the same in-panel notification to the player and their guardian. */
  private async notifyPlayerAndGuardian(
    playerId: number,
    playerName: string,
    title: string,
    message: string,
    type: NotificationType,
  ): Promise<void> {
    await this.notifications.create({
      userType: NotificationAudience.PLAYER,
      userId: playerId,
      title,
      message,
      type,
      link: '/app/reports',
    });

    const guardian = await this.guardians.guardianOfPlayer(playerId);
    if (guardian) {
      await this.notifications.create({
        userType: NotificationAudience.GUARDIAN,
        userId: guardian.id,
        title: `${title} — ${playerName}`,
        message,
        type,
        link: `/guardian/player/${playerId}`,
      });
    }
  }
}
