import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { ClassroomService } from './classroom.service';

const APP_URL = process.env.APP_URL ?? '';

/**
 * Port of app/Controllers/ClassroomController.php (9 routes).
 *
 * Two role gates, both inline in the legacy code rather than via RBAC
 * permissions, so they stay inline here:
 *
 *  - checkAuth() override: every route is limited to super_admin, coach and
 *    secretary; anyone else is redirected to /403.
 *  - canManageClassrooms(): the mutating actions are super_admin only. GET
 *    actions redirect to /403, POST actions return JSON 403.
 */
@Controller()
export class ClassroomController extends BaseController {
  constructor(private readonly classrooms: ClassroomService) {
    super();
  }

  /** ClassroomController::checkAuth() */
  private hasClassroomAccess(req: Request): boolean {
    const role = this.getUserRole(req);
    return role === 'super_admin' || role === 'coach' || role === 'secretary';
  }

  /** ClassroomController::canManageClassrooms() */
  private canManageClassrooms(req: Request): boolean {
    return this.getUserRole(req) === 'super_admin';
  }

  /** GET /classrooms */
  @Get('/classrooms')
  async index(@Req() req: Request, @Res() res: Response) {
    if (!this.hasClassroomAccess(req)) {
      return this.redirect(res, '/403');
    }

    const classrooms = await this.classrooms.all();

    // Fetch player count for each classroom
    for (const classroom of classrooms) {
      classroom.player_count = await this.classrooms.countPlayers(
        parseInt(classroom.id, 10),
      );
    }

    return this.render(req, res, 'classrooms/index', {
      title: 'کلاس‌ها (تیم‌ها)',
      classrooms,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** GET /classroom/create - admin only */
  @Get('/classroom/create')
  async create(@Req() req: Request, @Res() res: Response) {
    if (!this.hasClassroomAccess(req)) {
      return this.redirect(res, '/403');
    }
    if (!this.canManageClassrooms(req)) {
      return this.redirect(res, '/403');
    }

    return this.render(req, res, 'classrooms/form', {
      title: 'کلاس جدید',
      classroom: null,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /classroom/store - admin only */
  @Post('/classroom/store')
  async store(@Req() req: Request, @Res() res: Response) {
    if (!this.hasClassroomAccess(req)) {
      return this.redirect(res, '/403');
    }
    if (!this.canManageClassrooms(req)) {
      return this.json(res, { error: 'Unauthorized' }, 403);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const name = SecurityHelper.sanitizeString(this.post(req, 'name') ?? '');
    const description = SecurityHelper.sanitizeString(
      this.post(req, 'description') ?? '',
    );
    const coachId = this.post(req, 'coach_id')
      ? parseInt(String(this.post(req, 'coach_id')), 10)
      : null;

    if (!name) {
      return this.json(res, { error: 'نام کلاس الزامی است' }, 422);
    }

    // Check uniqueness
    if ((await this.classrooms.findByName(name)) !== null) {
      return this.json(res, { error: 'کلاسی با این نام از قبل وجود دارد' }, 422);
    }

    const classroomId = await this.classrooms.createClassroom({
      name,
      description,
      coach_id: coachId,
    });

    if (!classroomId) {
      return this.json(res, { error: 'خطا در ثبت کلاس' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'کلاس با موفقیت ایجاد شد',
      redirect: `${APP_URL}/classrooms`,
    });
  }

  /** GET /classroom/edit/:id - admin only */
  @Get('/classroom/edit/:id')
  async edit(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.hasClassroomAccess(req)) {
      return this.redirect(res, '/403');
    }
    if (!this.canManageClassrooms(req)) {
      return this.redirect(res, '/403');
    }

    const classroomId = parseInt(id, 10);
    const classroom = await this.classrooms.find(classroomId);

    if (classroom === null) {
      return this.redirect(res, '/classrooms');
    }

    return this.render(req, res, 'classrooms/form', {
      title: 'ویرایش کلاس',
      classroom,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /classroom/update/:id - admin only */
  @Post('/classroom/update/:id')
  async update(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.hasClassroomAccess(req)) {
      return this.redirect(res, '/403');
    }
    if (!this.canManageClassrooms(req)) {
      return this.json(res, { error: 'Unauthorized' }, 403);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const classroomId = parseInt(id, 10);
    const classroom = await this.classrooms.find(classroomId);

    if (classroom === null) {
      return this.json(res, { error: 'Classroom not found' }, 404);
    }

    const name = SecurityHelper.sanitizeString(this.post(req, 'name') ?? '');
    const description = SecurityHelper.sanitizeString(
      this.post(req, 'description') ?? '',
    );
    const coachId = this.post(req, 'coach_id')
      ? parseInt(String(this.post(req, 'coach_id')), 10)
      : null;

    if (!name) {
      return this.json(res, { error: 'نام کلاس الزامی است' }, 422);
    }

    // Check duplicate name for other classroom
    const existing = await this.classrooms.findByName(name);
    if (existing !== null && parseInt(existing.id, 10) !== classroomId) {
      return this.json(res, { error: 'کلاسی با این نام از قبل وجود دارد' }, 422);
    }

    const ok = await this.classrooms.updateClassroom(classroomId, {
      name,
      description,
      coach_id: coachId,
    });
    if (!ok) {
      return this.json(res, { error: 'خطا در بروزرسانی اطلاعات' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'تغییرات با موفقیت ذخیره شد',
      redirect: `${APP_URL}/classrooms`,
    });
  }

  /** GET /classroom/view/:id - roster */
  @Get('/classroom/view/:id')
  async view(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.hasClassroomAccess(req)) {
      return this.redirect(res, '/403');
    }

    const classroomId = parseInt(id, 10);
    const classroom = await this.classrooms.find(classroomId);

    if (classroom === null) {
      return this.redirect(res, '/classrooms');
    }

    // Get roster
    const roster = await this.classrooms.getRoster(classroomId);

    // Get unassigned/available players to add
    const availablePlayers =
      await this.classrooms.getAvailablePlayersForClassroom(classroomId);

    return this.render(req, res, 'classrooms/view', {
      title: `کلاس ${classroom.name}`,
      classroom,
      roster,
      available_players: availablePlayers,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /classroom/add-player/:id - admin only */
  @Post('/classroom/add-player/:id')
  async addPlayer(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.hasClassroomAccess(req)) {
      return this.redirect(res, '/403');
    }
    if (!this.canManageClassrooms(req)) {
      return this.json(res, { error: 'Unauthorized' }, 403);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const classroomId = parseInt(id, 10);
    const classroom = await this.classrooms.find(classroomId);

    if (classroom === null) {
      return this.json(res, { error: 'Classroom not found' }, 404);
    }

    const playerId = parseInt(String(this.post(req, 'player_id') ?? 0), 10) || 0;
    const player = await this.classrooms.findPlayer(playerId);

    if (player === null) {
      return this.json(res, { error: 'Player not found' }, 404);
    }

    const ok = await this.classrooms.updatePlayer(playerId, {
      classroom_id: classroomId,
    });
    if (!ok) {
      return this.json(res, { error: 'خطا در افزودن بازیکن به کلاس' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'بازیکن با موفقیت به کلاس اضافه شد',
      redirect: `${APP_URL}/classroom/view/${classroomId}`,
    });
  }

  /** POST /classroom/remove-player/:id - admin only */
  @Post('/classroom/remove-player/:id')
  async removePlayer(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    if (!this.hasClassroomAccess(req)) {
      return this.redirect(res, '/403');
    }
    if (!this.canManageClassrooms(req)) {
      return this.json(res, { error: 'Unauthorized' }, 403);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const classroomId = parseInt(id, 10);
    const classroom = await this.classrooms.find(classroomId);

    if (classroom === null) {
      return this.json(res, { error: 'Classroom not found' }, 404);
    }

    const playerId = parseInt(String(this.post(req, 'player_id') ?? 0), 10) || 0;
    const player = await this.classrooms.findPlayer(playerId);

    if (player === null) {
      return this.json(res, { error: 'Player not found' }, 404);
    }

    // Set classroom_id to null
    const ok = await this.classrooms.updatePlayer(playerId, { classroom_id: null });
    if (!ok) {
      return this.json(res, { error: 'خطا در حذف بازیکن از کلاس' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'بازیکن با موفقیت از کلاس حذف شد',
      redirect: `${APP_URL}/classroom/view/${classroomId}`,
    });
  }

  /**
   * POST /classroom/delete/:id - admin only, hard delete.
   * fc_players.classroom_id has ON DELETE SET NULL, so players are detached
   * by the database itself.
   */
  @Post('/classroom/delete/:id')
  async delete(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.hasClassroomAccess(req)) {
      return this.redirect(res, '/403');
    }
    if (!this.canManageClassrooms(req)) {
      return this.json(res, { error: 'Unauthorized' }, 403);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const classroomId = parseInt(id, 10);
    const classroom = await this.classrooms.find(classroomId);

    if (classroom === null) {
      return this.json(res, { error: 'Classroom not found' }, 404);
    }

    if (!(await this.classrooms.deleteClassroom(classroomId))) {
      return this.json(res, { error: 'Failed to delete classroom' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'کلاس حذف شد',
      redirect: `${APP_URL}/classrooms`,
    });
  }
}
