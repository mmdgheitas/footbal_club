import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { RbacService } from '../../common/rbac/rbac.service';
import { ClassroomService } from './classroom.service';
import { viewBasePath } from '../../common/views/base-path';

/** Relative prefix; see common/views/base-path.ts. */
const APP_URL = viewBasePath();

/**
 * Port of app/Controllers/ClassroomController.php (9 routes).
 *
 * Access is decided by the RBAC matrix (common/rbac/rbac.service.ts) rather
 * than by comparing role strings inline, which is how the legacy controller did
 * it. The old `role === 'super_admin'` check meant a single mismatch between
 * the stored role and that literal locked the club's own administrator out of
 * roster management while every other screen kept working. `hasPermission()`
 * short-circuits for super_admin, so that can no longer happen:
 *
 *   view    → manage_classrooms | view_classrooms | view_players
 *             (super_admin, secretary, coach, accountant…)
 *   manage  → manage_classrooms   (super_admin, and anything granted it later)
 *
 * The screens follow the same rule: a viewer who cannot manage never sees the
 * add/remove controls, instead of discovering it from a 403 after clicking.
 */
@Controller()
export class ClassroomController extends BaseController {
  constructor(private readonly classrooms: ClassroomService) {
    super();
  }

  /** May this user open the classroom screens at all? */
  private hasClassroomAccess(req: Request): boolean {
    return RbacService.hasAnyPermission(
      ['manage_classrooms', 'view_classrooms', 'view_players'],
      this.getUserRole(req),
    );
  }

  /** May this user create/edit classrooms and move players in and out? */
  private canManageClassrooms(req: Request): boolean {
    return RbacService.hasPermission('manage_classrooms', this.getUserRole(req));
  }

  /**
   * Refusal for a mutating route: a browser lands on the 403 page (with the
   * reason), a fetch caller still receives the JSON envelope it expects.
   */
  private denyManage(req: Request, res: Response): void {
    const role = this.getUserRole(req) ?? 'unknown';
    this.respond(req, res, {
      ok: false,
      message: `این عملیات نیاز به دسترسی «مدیریت کلاس‌ها» دارد (نقش فعلی شما: ${role}).`,
      redirect: `/403?message=${encodeURIComponent('مدیریت کلاس‌ها فقط برای مدیر ارشد فعال است.')}`,
      json: { error: 'Unauthorized' },
      status: 403,
    });
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
      can_manage: this.canManageClassrooms(req),
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
      return this.denyManage(req, res);
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
      return this.denyManage(req, res);
    }

    if (!this.validateCsrf(req)) {
      return this.respond(req, res, {
        ok: false,
        message: 'درخواست نامعتبر است (نشست شما منقضی شده). صفحه را تازه کنید و دوباره تلاش کنید.',
        redirect: `/classroom/view/${parseInt(id, 10)}`,
        json: { error: 'Invalid CSRF token' },
        status: 403,
      });
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

    // Shown when the list is empty so «no players to add» is never mistaken
    // for «you are not allowed to add players».
    const awaiting = await this.classrooms.playersAwaitingActivation();

    return this.render(req, res, 'classrooms/view', {
      title: `کلاس ${classroom.name}`,
      classroom,
      roster,
      available_players: availablePlayers,
      awaiting_players: awaiting,
      can_manage: this.canManageClassrooms(req),
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
      return this.denyManage(req, res);
    }

    if (!this.validateCsrf(req)) {
      return this.respond(req, res, {
        ok: false,
        message: 'درخواست نامعتبر است (نشست شما منقضی شده). صفحه را تازه کنید و دوباره تلاش کنید.',
        redirect: `/classroom/view/${parseInt(id, 10)}`,
        json: { error: 'Invalid CSRF token' },
        status: 403,
      });
    }

    const classroomId = parseInt(id, 10);
    const classroom = await this.classrooms.find(classroomId);

    if (classroom === null) {
      return this.respond(req, res, {
        ok: false,
        message: 'کلاس یافت نشد.',
        redirect: '/classrooms',
        json: { error: 'Classroom not found' },
        status: 404,
      });
    }

    const playerId = parseInt(String(this.post(req, 'player_id') ?? 0), 10) || 0;
    const player = await this.classrooms.findPlayer(playerId);

    if (player === null) {
      return this.respond(req, res, {
        ok: false,
        message: 'بازیکن یافت نشد.',
        redirect: `/classroom/view/${classroomId}`,
        json: { error: 'Player not found' },
        status: 404,
      });
    }

    const ok = await this.classrooms.updatePlayer(playerId, {
      classroom_id: classroomId,
    });
    if (!ok) {
      return this.respond(req, res, {
        ok: false,
        message: 'خطا در افزودن بازیکن به کلاس',
        redirect: `/classroom/view/${classroomId}`,
        json: { error: 'خطا در افزودن بازیکن به کلاس' },
        status: 500,
      });
    }

    return this.respond(req, res, {
      ok: true,
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
      return this.denyManage(req, res);
    }

    if (!this.validateCsrf(req)) {
      return this.respond(req, res, {
        ok: false,
        message: 'درخواست نامعتبر است (نشست شما منقضی شده). صفحه را تازه کنید و دوباره تلاش کنید.',
        redirect: `/classroom/view/${parseInt(id, 10)}`,
        json: { error: 'Invalid CSRF token' },
        status: 403,
      });
    }

    const classroomId = parseInt(id, 10);
    const classroom = await this.classrooms.find(classroomId);

    if (classroom === null) {
      return this.respond(req, res, {
        ok: false,
        message: 'کلاس یافت نشد.',
        redirect: '/classrooms',
        json: { error: 'Classroom not found' },
        status: 404,
      });
    }

    const playerId = parseInt(String(this.post(req, 'player_id') ?? 0), 10) || 0;
    const player = await this.classrooms.findPlayer(playerId);

    if (player === null) {
      return this.respond(req, res, {
        ok: false,
        message: 'بازیکن یافت نشد.',
        redirect: `/classroom/view/${classroomId}`,
        json: { error: 'Player not found' },
        status: 404,
      });
    }

    // Set classroom_id to null
    const ok = await this.classrooms.updatePlayer(playerId, { classroom_id: null });
    if (!ok) {
      return this.respond(req, res, {
        ok: false,
        message: 'خطا در حذف بازیکن از کلاس',
        redirect: `/classroom/view/${classroomId}`,
        json: { error: 'خطا در حذف بازیکن از کلاس' },
        status: 500,
      });
    }

    return this.respond(req, res, {
      ok: true,
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
      return this.denyManage(req, res);
    }

    if (!this.validateCsrf(req)) {
      return this.respond(req, res, {
        ok: false,
        message: 'درخواست نامعتبر است (نشست شما منقضی شده). صفحه را تازه کنید و دوباره تلاش کنید.',
        redirect: `/classroom/view/${parseInt(id, 10)}`,
        json: { error: 'Invalid CSRF token' },
        status: 403,
      });
    }

    const classroomId = parseInt(id, 10);
    const classroom = await this.classrooms.find(classroomId);

    if (classroom === null) {
      return this.respond(req, res, {
        ok: false,
        message: 'کلاس یافت نشد.',
        redirect: '/classrooms',
        json: { error: 'Classroom not found' },
        status: 404,
      });
    }

    if (!(await this.classrooms.deleteClassroom(classroomId))) {
      return this.respond(req, res, {
        ok: false,
        message: 'حذف کلاس ناموفق بود.',
        redirect: '/classrooms',
        json: { error: 'Failed to delete classroom' },
        status: 500,
      });
    }

    return this.respond(req, res, {
      ok: true,
      message: 'کلاس حذف شد',
      redirect: `${APP_URL}/classrooms`,
    });
  }
}
