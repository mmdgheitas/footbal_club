import { Controller, Get, Param, Post, Req, Res, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { JalaliHelper } from '../../common/helpers/jalali.helper';
import { PLAYER_POSITIONS } from '../../config/constants';
import { PlayersService } from './players.service';

/** Port of app/Controllers/PlayerController.php. */
@Controller()
export class PlayerController extends BaseController {
  constructor(private readonly players: PlayersService) {
    super();
  }

  /**
   * Jalali -> Gregorian date-of-birth normalisation, copied from the legacy
   * store()/update(). Only values whose year is in the Jalali range are
   * converted; anything else is passed through untouched.
   */
  private normalizeDateOfBirth(raw: unknown): string {
    const rawDob = raw == null ? '' : String(raw);
    let dob = rawDob;
    if (rawDob) {
      let normalized = rawDob.trim().replace(/-/g, '/');
      normalized = JalaliHelper.persianToLatinNumbers(normalized);
      const parts = normalized.split('/');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10) || 0;
        if (year >= 1300 && year <= 1500) {
          dob = JalaliHelper.toGregorianString(rawDob);
        }
      }
    }
    return dob;
  }

  /** PlayerController::validatePlayerData() */
  private validatePlayerData(data: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!data.name) {
      errors.push('Player name is required');
    }

    if (!data.date_of_birth) {
      errors.push('Date of birth is required');
    } else {
      const dob = new Date(`${data.date_of_birth}T00:00:00Z`);
      const valid =
        /^\d{4}-\d{2}-\d{2}$/.test(String(data.date_of_birth)) && !isNaN(dob.getTime());
      if (!valid || dob.getTime() > Date.now()) {
        errors.push('Invalid date of birth');
      }
    }

    if (!data.national_id) {
      errors.push('National ID is required');
    }

    if (!data.position) {
      errors.push('Position is required');
    } else if (!Object.prototype.hasOwnProperty.call(PLAYER_POSITIONS, data.position)) {
      errors.push('Invalid position');
    }

    if (data.email && !SecurityHelper.validateEmail(data.email)) {
      errors.push('Invalid email address');
    }

    return errors;
  }

  @Get('/players')
  @Permissions('manage_players')
  async index(@Req() req: Request, @Res() res: Response): Promise<void> {
    const page = parseInt(String(this.query(req, 'page') ?? 1), 10) || 1;
    const search = SecurityHelper.sanitizeString(String(this.query(req, 'search') ?? ''));
    const classroomId = this.query(req, 'classroom_id')
      ? parseInt(String(this.query(req, 'classroom_id')), 10)
      : null;

    const classrooms = await this.players.listClassrooms();
    const paginated = await this.players.getPlayersList(page, search, classroomId);

    this.render(req, res, 'players/index', {
      title: 'بازیکنان',
      players: paginated.data,
      pagination: paginated,
      classrooms,
      selected_classroom_id: classroomId,
      search,
      csrf_token: this.generateCsrf(req),
    });
  }

  @Get('/player/create')
  @Permissions('manage_players')
  async create(@Req() req: Request, @Res() res: Response): Promise<void> {
    const classrooms = await this.players.listClassrooms();
    this.render(req, res, 'players/form', {
      title: 'افزودن بازیکن',
      classrooms,
      positions: PLAYER_POSITIONS,
      csrf_token: this.generateCsrf(req),
    });
  }

  @Post('/player/store')
  @Permissions('manage_players')
  @UseInterceptors(AnyFilesInterceptor())
  async store(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.json(res, { error: 'Invalid CSRF token' }, 403);
      return;
    }

    const dob = this.normalizeDateOfBirth(this.post(req, 'date_of_birth'));
    const medicalClearance = Boolean(this.post(req, 'medical_clearance'));

    // Mirrors the legacy upload guards on medical clearance.
    const files = (req.files ?? {}) as Record<string, unknown>;
    if (medicalClearance && Object.keys(files).length === 0) {
      this.json(
        res,
        { error: 'برای تأیید مجوز پزشکی، باید حداقل یک سند پزشکی آپلود کنید' },
        422,
      );
      return;
    }
    if (medicalClearance) {
      const hasMedicalFile = Object.keys(files).some((fieldName) =>
        fieldName.includes('medical_clearance'),
      );
      if (!hasMedicalFile) {
        this.json(
          res,
          { error: 'برای تأیید مجوز پزشکی، باید سند مجوز پزشکی آپلود کنید' },
          422,
        );
        return;
      }
    }

    const data: Record<string, any> = {
      name: SecurityHelper.sanitizeString(String(this.post(req, 'name') ?? '')),
      date_of_birth: dob,
      classroom_id: this.post(req, 'classroom_id')
        ? parseInt(String(this.post(req, 'classroom_id')), 10)
        : null,
      national_id: SecurityHelper.sanitizeString(String(this.post(req, 'national_id') ?? '')),
      position: this.post(req, 'position') ?? '',
      phone: SecurityHelper.sanitizeString(String(this.post(req, 'phone') ?? '')),
      email: SecurityHelper.sanitizeString(String(this.post(req, 'email') ?? '')),
      notes: SecurityHelper.sanitizeString(String(this.post(req, 'notes') ?? '')),
      medical_clearance: medicalClearance ? 1 : 0,
    };

    const errors = this.validatePlayerData(data);
    if (errors.length > 0) {
      this.json(res, { errors }, 422);
      return;
    }

    if ((await this.players.findByNationalId(data.national_id)) !== null) {
      this.json(res, { error: 'National ID already exists' }, 422);
      return;
    }

    const playerId = await this.players.createPlayer(data);
    if (!playerId) {
      this.json(res, { error: 'Failed to create player' }, 500);
      return;
    }

    this.json(res, {
      success: true,
      player_id: playerId,
      redirect: `${process.env.APP_URL ?? ''}/player/view/${playerId}`,
    });
  }

  @Get('/player/edit/:id')
  @Permissions('manage_players')
  async edit(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const playerId = parseInt(id, 10);
    const player = await this.players.getWithDetails(playerId);

    if (player === null) {
      this.redirect(res, '/players');
      return;
    }

    if (player.date_of_birth) {
      player.date_of_birth = JalaliHelper.toJalaliString(String(player.date_of_birth));
    }

    const classrooms = await this.players.listClassrooms();
    this.render(req, res, 'players/form', {
      title: 'ویرایش بازیکن',
      player,
      classrooms,
      positions: PLAYER_POSITIONS,
      csrf_token: this.generateCsrf(req),
    });
  }

  @Post('/player/update/:id')
  @Permissions('manage_players')
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.json(res, { error: 'Invalid CSRF token' }, 403);
      return;
    }

    const playerId = parseInt(id, 10);
    const player = await this.players.find(playerId);

    if (player === null) {
      this.json(res, { error: 'Player not found' }, 404);
      return;
    }

    const dob = this.normalizeDateOfBirth(this.post(req, 'date_of_birth'));
    const medicalClearance = Boolean(this.post(req, 'medical_clearance'));

    // Setting clearance for the first time requires an approved medical document.
    if (medicalClearance && !Number(player.medical_clearance)) {
      const medicalFiles = await this.players.findMedicalClearanceFiles(playerId);
      if (medicalFiles.length === 0) {
        this.json(
          res,
          { error: 'برای تأیید مجوز پزشکی، باید سند مجوز پزشکی آپلود و تأیید شده باشد' },
          422,
        );
        return;
      }
    }

    const data: Record<string, any> = {
      name: SecurityHelper.sanitizeString(String(this.post(req, 'name') ?? '')),
      date_of_birth: dob,
      classroom_id: this.post(req, 'classroom_id')
        ? parseInt(String(this.post(req, 'classroom_id')), 10)
        : null,
      national_id: SecurityHelper.sanitizeString(String(this.post(req, 'national_id') ?? '')),
      position: this.post(req, 'position') ?? '',
      phone: SecurityHelper.sanitizeString(String(this.post(req, 'phone') ?? '')),
      email: SecurityHelper.sanitizeString(String(this.post(req, 'email') ?? '')),
      notes: SecurityHelper.sanitizeString(String(this.post(req, 'notes') ?? '')),
      medical_clearance: medicalClearance ? 1 : 0,
    };

    const errors = this.validatePlayerData(data);
    if (errors.length > 0) {
      this.json(res, { errors }, 422);
      return;
    }

    if (player.national_id !== data.national_id) {
      if ((await this.players.findByNationalId(data.national_id)) !== null) {
        this.json(res, { error: 'National ID already exists' }, 422);
        return;
      }
    }

    if (!(await this.players.update(playerId, data))) {
      this.json(res, { error: 'Failed to update player' }, 500);
      return;
    }

    this.json(res, {
      success: true,
      redirect: `${process.env.APP_URL ?? ''}/player/view/${playerId}`,
    });
  }

  @Get('/player/view/:id')
  @Permissions('view_players')
  async view(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const playerId = parseInt(id, 10);
    const player = await this.players.getWithDetails(playerId);

    if (player === null) {
      this.redirect(res, '/players');
      return;
    }

    this.render(req, res, 'players/view', { title: player.name, player });
  }

  @Post('/player/delete/:id')
  @Permissions('manage_players')
  async delete(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.json(res, { error: 'Invalid CSRF token' }, 403);
      return;
    }

    const playerId = parseInt(id, 10);
    const player = await this.players.find(playerId);

    if (player === null) {
      this.json(res, { error: 'Player not found' }, 404);
      return;
    }

    if (!(await this.players.softDelete(playerId))) {
      this.json(res, { error: 'Failed to delete player' }, 500);
      return;
    }

    this.json(res, { success: true });
  }
}
