import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { RbacService } from '../../common/rbac/rbac.service';
import { AchievementService } from './achievement.service';

const APP_URL = process.env.APP_URL ?? '';

/** Duplicated verbatim in the legacy create() and edit(). */
const ACHIEVEMENT_TYPES = {
  skill: 'مهارت',
  attendance: 'حضور',
  sportsmanship: 'روحیه ورزشی',
  improvement: 'پیشرفت',
  teamwork: 'کاری تیمی',
  leadership: 'رهبری',
  other: 'دیگر',
};

/** PHP date('Y-m-d') in local time. */
function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * PHP (bool) cast semantics for a POST value combined with `?? $fallback`:
 * a missing key yields the fallback; "0" and "" are false; anything else
 * non-empty is true.
 */
function phpBool(value: any, fallback: any): boolean {
  if (value === null || value === undefined) {
    return Boolean(fallback);
  }
  if (value === '' || value === '0' || value === 0) {
    return false;
  }
  return Boolean(value);
}

/**
 * Port of app/Controllers/AchievementController.php (7 routes).
 */
@Controller()
export class AchievementController extends BaseController {
  constructor(private readonly achievements: AchievementService) {
    super();
  }

  /**
   * GET /achievements - players see their own published achievements,
   * staff see the management view (requires manage_players).
   */
  @Get('/achievements')
  async index(@Req() req: Request, @Res() res: Response) {
    const user: any = this.getUser(req);

    if (user === null) {
      return this.redirect(res, '/403');
    }

    if (user.role === 'player') {
      const playerId = user.player_id ?? null;
      if (!playerId) {
        return this.redirect(res, '/player-panel');
      }

      const [achievements, stats] = await Promise.all([
        this.achievements.getByPlayerId(playerId, true),
        this.achievements.getPlayerStats(playerId),
      ]);

      return this.render(req, res, 'achievements/index', {
        title: 'دستیافت‌ها',
        achievements,
        stats,
        is_admin: false,
      });
    }

    // Staff branch: RbacMiddleware::requirePermission('manage_players')
    if (!this.requirePermission(req, res, 'manage_players')) {
      return;
    }

    const playerId = this.query(req, 'player_id')
      ? parseInt(String(this.query(req, 'player_id')), 10)
      : null;

    let achievements: any[];
    let player: any = null;
    if (playerId) {
      achievements = await this.achievements.getByPlayerId(playerId, false);
      player = await this.achievements.findPlayer(playerId);
    } else {
      achievements = await this.achievements.getRecent(50);
    }

    const allPlayers = await this.achievements.getActivePlayers();

    return this.render(req, res, 'achievements/index', {
      title: 'مدیریت دستاوردها',
      achievements,
      players: allPlayers,
      selected_player: player,
      is_admin: true,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** GET /achievements/create */
  @Get('/achievements/create')
  @Permissions('manage_players')
  async create(@Req() req: Request, @Res() res: Response) {
    const players = await this.achievements.getActivePlayers();

    return this.render(req, res, 'achievements/form', {
      title: 'افزودن دستاورد',
      players,
      achievement_types: ACHIEVEMENT_TYPES,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /achievements/store */
  @Post('/achievements/store')
  @Permissions('manage_players')
  async store(@Req() req: Request, @Res() res: Response) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const adminId = this.getUserId(req);
    const playerId = parseInt(String(this.post(req, 'player_id') ?? 0), 10) || 0;
    const title = SecurityHelper.sanitizeString(this.post(req, 'title') ?? '');
    const description = SecurityHelper.sanitizeString(
      this.post(req, 'description') ?? '',
    );
    const achievementType = this.post(req, 'achievement_type') ?? 'skill';
    const points = parseInt(String(this.post(req, 'points') ?? 0), 10) || 0;
    const dateAchieved = this.post(req, 'date_achieved') ?? todayLocal();
    const isPublished = phpBool(this.post(req, 'is_published'), true);

    if (!playerId) {
      return this.json(res, { error: 'Player is required' }, 422);
    }

    if (!title) {
      return this.json(res, { error: 'Title is required' }, 422);
    }

    const player = await this.achievements.findPlayer(playerId);
    if (player === null) {
      return this.json(res, { error: 'Player not found' }, 404);
    }

    const linkedUser = await this.achievements.findUserByPlayerId(playerId);
    const userId = linkedUser?.id ?? null;

    const achievementId = await this.achievements.createAchievement({
      player_id: playerId,
      user_id: userId,
      title,
      description,
      achievement_type: achievementType,
      points,
      date_achieved: dateAchieved,
      created_by: adminId,
      is_published: isPublished ? 1 : 0,
    });

    if (!achievementId) {
      return this.json(res, { error: 'Failed to create achievement' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'Achievement created successfully',
      redirect: `${APP_URL}/achievements`,
    });
  }

  /** GET /achievements/edit/:id */
  @Get('/achievements/edit/:id')
  @Permissions('manage_players')
  async edit(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const achievementId = parseInt(id, 10);
    const achievement = await this.achievements.getAchievement(achievementId);

    if (achievement === null) {
      return this.redirect(res, '/achievements');
    }

    const players = await this.achievements.getActivePlayers();

    return this.render(req, res, 'achievements/form', {
      title: 'ویرایش دستاورد',
      achievement,
      players,
      achievement_types: ACHIEVEMENT_TYPES,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /achievements/update/:id */
  @Post('/achievements/update/:id')
  @Permissions('manage_players')
  async update(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const achievementId = parseInt(id, 10);
    const achievement = await this.achievements.getAchievement(achievementId);

    if (achievement === null) {
      return this.json(res, { error: 'Achievement not found' }, 404);
    }

    const playerId =
      parseInt(String(this.post(req, 'player_id') ?? achievement.player_id), 10) || 0;
    const title = SecurityHelper.sanitizeString(this.post(req, 'title') ?? '');
    const description = SecurityHelper.sanitizeString(
      this.post(req, 'description') ?? '',
    );
    const achievementType =
      this.post(req, 'achievement_type') ?? achievement.achievement_type;
    const points = parseInt(
      String(this.post(req, 'points') ?? achievement.points),
      10,
    ) || 0;
    const dateAchieved = this.post(req, 'date_achieved') ?? achievement.date_achieved;
    const isPublished = phpBool(
      this.post(req, 'is_published'),
      achievement.is_published,
    );

    if (!playerId) {
      return this.json(res, { error: 'Player is required' }, 422);
    }

    if (!title) {
      return this.json(res, { error: 'Title is required' }, 422);
    }

    const player = await this.achievements.findPlayer(playerId);
    if (player === null) {
      return this.json(res, { error: 'Player not found' }, 404);
    }

    const linkedUser = await this.achievements.findUserByPlayerId(playerId);
    const userId = linkedUser?.id ?? null;

    const ok = await this.achievements.updateAchievement(achievementId, {
      player_id: playerId,
      user_id: userId,
      title,
      description,
      achievement_type: achievementType,
      points,
      date_achieved: dateAchieved,
      is_published: isPublished ? 1 : 0,
    });

    if (!ok) {
      return this.json(res, { error: 'Failed to update achievement' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'Achievement updated successfully',
      redirect: `${APP_URL}/achievements`,
    });
  }

  /** POST /achievements/delete/:id - soft delete */
  @Post('/achievements/delete/:id')
  @Permissions('manage_players')
  async delete(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const achievementId = parseInt(id, 10);
    if (!(await this.achievements.deleteAchievement(achievementId))) {
      return this.json(res, { error: 'Failed to delete achievement' }, 500);
    }

    return this.json(res, { success: true, message: 'Achievement deleted' });
  }

  /** POST /achievements/toggle-publish/:id */
  @Post('/achievements/toggle-publish/:id')
  @Permissions('manage_players')
  async togglePublish(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    const achievementId = parseInt(id, 10);
    const achievement = await this.achievements.getAchievement(achievementId);

    if (achievement === null) {
      return this.json(res, { error: 'Achievement not found' }, 404);
    }

    const newStatus = !achievement.is_published;
    if (!(await this.achievements.togglePublish(achievementId, newStatus))) {
      return this.json(res, { error: 'Failed to update publish status' }, 500);
    }

    return this.json(res, { success: true, is_published: newStatus });
  }

  /**
   * RbacMiddleware::requirePermission() for the one branch that checks
   * inline. Returns false once the 403 page has been rendered.
   */
  private requirePermission(
    req: Request,
    res: Response,
    permission: string,
  ): boolean {
    if (RbacService.hasPermission(permission, this.getUserRole(req))) {
      return true;
    }
    this.renderStandalone(
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
    return false;
  }
}
