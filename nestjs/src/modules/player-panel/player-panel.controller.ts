import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { PlayerPanelService } from './player-panel.service';
import { PlayersService } from '../players/players.service';
import { AlertService } from '../alerts/alert.service';

/**
 * Port of app/Controllers/PlayerPanelController.php (8 routes).
 *
 * The legacy constructor performs every gate, so every action inherits it:
 *   1. role must be 'player', else redirect /403
 *   2. session player_id must be non-zero, else render player_panel.no_link
 *   3. player must exist and have status === 1, else render no_link
 *   4. document_status must be 'approved', else redirect /documents/upload
 *
 * resolvePlayer() reproduces that and returns null once it has answered.
 */
@Controller()
export class PlayerPanelController extends BaseController {
  constructor(
    private readonly panel: PlayerPanelService,
    private readonly players: PlayersService,
    private readonly alertService: AlertService,
  ) {
    super();
  }

  private async resolvePlayer(
    req: Request,
    res: Response,
  ): Promise<{ playerId: number; player: any } | null> {
    const user: any = this.getUser(req);

    if (this.getUserRole(req) !== 'player') {
      this.redirect(res, '/403');
      return null;
    }

    const playerId = parseInt(String(user?.player_id ?? 0), 10) || 0;
    if (playerId === 0) {
      this.render(req, res, 'player_panel/no_link', { title: 'خطا' });
      return null;
    }

    const player = await this.panel.findPlayer(playerId);
    // PDO returns native ints (ATTR_EMULATE_PREPARES is false), so the
    // legacy strict `!== 1` compares against a real integer. mysql2 matches.
    if (player === null || player.status !== 1) {
      this.render(req, res, 'player_panel/no_link', { title: 'خطا' });
      return null;
    }

    if ((user?.document_status ?? '') !== 'approved') {
      this.redirect(res, '/documents/upload');
      return null;
    }

    return { playerId, player };
  }

  /** GET /player-panel */
  @Get('/player-panel')
  async index(@Req() req: Request, @Res() res: Response) {
    const ctx = await this.resolvePlayer(req, res);
    if (!ctx) return;

    const [attendanceRate, totalOutstanding, totalPaid, allAlerts] =
      await Promise.all([
        this.panel.getAttendancePercentage(ctx.playerId),
        this.panel.getTotalOutstandingByPlayer(ctx.playerId),
        this.panel.getTotalPaidByPlayer(ctx.playerId),
        this.alertService.getAlertsForPlayer(ctx.player.age_category ?? 'senior'),
      ]);

    return this.render(req, res, 'player_panel/index', {
      title: 'داشبورد بازیکن',
      player: ctx.player,
      attendance_rate: attendanceRate,
      total_outstanding: totalOutstanding,
      total_paid: totalPaid,
      recent_alerts: allAlerts.slice(0, 3),
    });
  }

  /** GET /player-panel/financial */
  @Get('/player-panel/financial')
  async financial(@Req() req: Request, @Res() res: Response) {
    const ctx = await this.resolvePlayer(req, res);
    if (!ctx) return;

    const [payments, totalOutstanding, totalPaid] = await Promise.all([
      this.panel.getPaymentsByPlayerId(ctx.playerId),
      this.panel.getTotalOutstandingByPlayer(ctx.playerId),
      this.panel.getTotalPaidByPlayer(ctx.playerId),
    ]);

    return this.render(req, res, 'player_panel/financial', {
      title: 'وضعیت مالی',
      player: ctx.player,
      payments,
      total_outstanding: totalOutstanding,
      total_paid: totalPaid,
    });
  }

  /** GET /player-panel/attendance */
  @Get('/player-panel/attendance')
  async attendance(@Req() req: Request, @Res() res: Response) {
    const ctx = await this.resolvePlayer(req, res);
    if (!ctx) return;

    const attendanceRecords = await this.panel.getAttendanceByPlayerId(ctx.playerId);

    let present = 0;
    let absent = 0;
    let excused = 0;
    let late = 0;
    for (const record of attendanceRecords) {
      const status = parseInt(record.status, 10);
      if (status === 1) present++;
      else if (status === 2) absent++;
      else if (status === 3) excused++;
      else if (status === 4) late++;
    }

    return this.render(req, res, 'player_panel/attendance', {
      title: 'حضور و غیاب',
      player: ctx.player,
      attendance: attendanceRecords,
      stats: {
        total: attendanceRecords.length,
        present,
        absent,
        excused,
        late,
        percentage: await this.panel.getAttendancePercentage(ctx.playerId),
      },
    });
  }

  /** GET /player-panel/profile */
  @Get('/player-panel/profile')
  async profile(@Req() req: Request, @Res() res: Response) {
    const ctx = await this.resolvePlayer(req, res);
    if (!ctx) return;

    const playerDetails = await this.players.getWithDetails(ctx.playerId);

    return this.render(req, res, 'player_panel/profile', {
      title: 'مشخصات فردی',
      player_details: playerDetails,
    });
  }

  /** GET /player-panel/alerts */
  @Get('/player-panel/alerts')
  async alerts(@Req() req: Request, @Res() res: Response) {
    const ctx = await this.resolvePlayer(req, res);
    if (!ctx) return;

    // Unlike /my-alerts, this page does pass playerId and classroomId.
    const alerts = await this.alertService.getAlertsForPlayer(
      ctx.player.age_category ?? 'senior',
      ctx.playerId,
      ctx.player.classroom_id ?? null,
    );

    return this.render(req, res, 'player_panel/alerts', {
      title: 'اعلانات باشگاه',
      alerts,
    });
  }

  /** GET /player-panel/achievements */
  @Get('/player-panel/achievements')
  async achievements(@Req() req: Request, @Res() res: Response) {
    const ctx = await this.resolvePlayer(req, res);
    if (!ctx) return;

    const [achievements, stats] = await Promise.all([
      this.panel.getAchievementsByPlayerId(ctx.playerId),
      this.panel.getAchievementStats(ctx.playerId),
    ]);

    return this.render(req, res, 'player_panel/achievements', {
      title: 'دستاوردهای من',
      achievements,
      stats,
      player: ctx.player,
    });
  }

  /** GET /player-panel/case-notes */
  @Get('/player-panel/case-notes')
  async caseNotes(@Req() req: Request, @Res() res: Response) {
    const ctx = await this.resolvePlayer(req, res);
    if (!ctx) return;

    const caseNotes = await this.panel.getVisibleCaseNotesByPlayerId(ctx.playerId);

    return this.render(req, res, 'player_panel/case_notes', {
      title: 'یادداشت‌های پرونده',
      case_notes: caseNotes,
      player: ctx.player,
    });
  }

  /** GET /player-panel/homework */
  @Get('/player-panel/homework')
  async homework(@Req() req: Request, @Res() res: Response) {
    const ctx = await this.resolvePlayer(req, res);
    if (!ctx) return;

    const videos = await this.panel.getHomeworkByPlayerId(ctx.playerId);

    return this.render(req, res, 'player_panel/homework', {
      title: 'تمرینات من',
      videos,
      player: ctx.player,
      csrf_token: this.generateCsrf(req),
    });
  }
}
