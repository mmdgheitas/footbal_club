import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { JalaliHelper } from '../../common/helpers/jalali.helper';
import { MedicalService } from './medical.service';

/**
 * Port of app/Controllers/MedicalController.php (3 routes).
 */
@Controller()
export class MedicalController extends BaseController {
  constructor(private readonly medical: MedicalService) {
    super();
  }

  /** GET /medical - RbacMiddleware::requirePermission('view_medical') */
  @Get('/medical')
  @Permissions('view_medical')
  index(@Req() req: Request, @Res() res: Response) {
    return this.medical.getActivePlayers().then((players) =>
      this.render(req, res, 'medical/index', {
        title: 'پزشکی',
        players,
        csrf_token: this.generateCsrf(req),
      }),
    );
  }

  /** GET /medical/view/:id */
  @Get('/medical/view/:id')
  @Permissions('view_medical')
  async view(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const playerId = parseInt(id, 10);
    const player = await this.medical.findPlayer(playerId);

    if (player === null) {
      return this.redirect(res, '/medical');
    }

    const [medical, injuries] = await Promise.all([
      this.medical.getByPlayerId(playerId),
      this.medical.getInjuriesByPlayerId(playerId),
    ]);

    return this.render(req, res, 'medical/view', {
      title: `پرونده پزشکی — ${player.name}`,
      player,
      medical,
      injuries,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /medical/update/:id - JSON only, 405 on non-POST. */
  @Post('/medical/update/:id')
  @Permissions('view_medical')
  async update(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (req.method !== 'POST') {
      return this.json(res, { error: 'Method not allowed' }, 405);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const playerId = parseInt(id, 10);

    if ((await this.medical.findPlayer(playerId)) === null) {
      return this.json(res, { error: 'Player not found' }, 404);
    }

    // Jalali -> Gregorian normalisation, only when the year looks Jalali.
    let examDate: string | null = String(this.post(req, 'last_exam_date') ?? '').trim();
    if (examDate !== '') {
      const normalized = JalaliHelper.persianToLatinNumbers(
        examDate.replace(/-/g, '/'),
      );
      const parts = normalized.split('/');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        if (year >= 1300 && year <= 1500) {
          examDate = JalaliHelper.toGregorianString(examDate);
        }
      }
    } else {
      examDate = null;
    }

    const data = {
      player_id: playerId,
      blood_type: SecurityHelper.sanitizeString(this.post(req, 'blood_type') ?? ''),
      allergies: SecurityHelper.sanitizeString(this.post(req, 'allergies') ?? ''),
      medical_conditions: SecurityHelper.sanitizeString(
        this.post(req, 'medical_conditions') ?? '',
      ),
      vaccination_status: SecurityHelper.sanitizeString(
        this.post(req, 'vaccination_status') ?? '',
      ),
      last_exam_date: examDate,
      exam_notes: SecurityHelper.sanitizeString(this.post(req, 'exam_notes') ?? ''),
    };

    if (!(await this.medical.createOrUpdate(data))) {
      return this.json(res, { error: 'Failed to update medical record' }, 500);
    }

    return this.json(res, { success: true });
  }
}
