import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { AGE_CATEGORIES, PLAYER_POSITIONS } from '../../config/constants';
import { AlertService } from './alert.service';

/** PHP date('Y-m-d H:i:s', strtotime($value)). */
function toDatetime(value: string): string {
  const d = new Date(value.includes('T') || value.includes(' ') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Port of app/Controllers/AlertController.php (4 routes).
 */
@Controller()
export class AlertController extends BaseController {
  constructor(private readonly alerts: AlertService) {
    super();
  }

  /** GET /admin/alerts - RbacMiddleware::requirePermission('manage_alerts') */
  @Get('/admin/alerts')
  @Permissions('manage_alerts')
  async index(@Req() req: Request, @Res() res: Response) {
    const [classrooms, players, alerts] = await Promise.all([
      this.alerts.getAllClassrooms(),
      this.alerts.getActivePlayers(),
      this.alerts.getActiveAlerts(),
    ]);

    return this.render(req, res, 'alerts/index', {
      title: 'مدیریت اعلانات',
      alerts,
      csrf_token: this.generateCsrf(req),
      age_categories: AGE_CATEGORIES,
      classrooms,
      players,
      player_positions: PLAYER_POSITIONS,
      priorities: {
        low: 'کم',
        medium: 'متوسط',
        high: 'بالا',
        urgent: 'فوری',
      },
    });
  }

  /** POST /admin/alerts/create - redirects with flashes, never JSON. */
  @Post('/admin/alerts/create')
  @Permissions('manage_alerts')
  async create(@Req() req: Request, @Res() res: Response) {
    if (req.method !== 'POST') {
      return this.redirect(res, '/admin/alerts');
    }

    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'توکن امنیتی نامعتبر است.');
      return this.redirect(res, '/admin/alerts');
    }

    const title = SecurityHelper.sanitizeString(this.post(req, 'title') ?? '');
    const message = SecurityHelper.sanitizeString(this.post(req, 'message') ?? '');
    const targetType = SecurityHelper.sanitizeString(
      this.post(req, 'target_type') ?? 'all',
    );
    const targetId = this.post(req, 'target_id')
      ? parseInt(String(this.post(req, 'target_id')), 10)
      : null;
    const targetAgeMin = this.post(req, 'target_age_min')
      ? parseInt(String(this.post(req, 'target_age_min')), 10)
      : null;
    const targetAgeMax = this.post(req, 'target_age_max')
      ? parseInt(String(this.post(req, 'target_age_max')), 10)
      : null;
    const priority = SecurityHelper.sanitizeString(
      this.post(req, 'priority') ?? 'medium',
    );
    let expiresAt: string | null = this.post(req, 'expires_at') ?? null;

    const errors: string[] = [];

    if (!title) {
      errors.push('عنوان اعلان الزامی است.');
    }
    if (!message) {
      errors.push('متن اعلان الزامی است.');
    }
    if (targetType === 'class' && !targetId) {
      errors.push('لطفاً یک کلاس انتخاب کنید.');
    }
    if (targetType === 'age_range') {
      if (!targetAgeMin || !targetAgeMax) {
        errors.push('لطفاً محدوده سنی را مشخص کنید.');
      }
      if (targetAgeMin && targetAgeMax && targetAgeMin > targetAgeMax) {
        errors.push('سن حداقل باید کمتر از سن حداکثر باشد.');
      }
    }
    if (targetType === 'player' && !targetId) {
      errors.push('لطفاً یک بازیکن انتخاب کنید.');
    }

    if (errors.length > 0) {
      for (const error of errors) {
        this.flash(req, 'error', error);
      }
      return this.redirect(res, '/admin/alerts');
    }

    if (expiresAt) {
      expiresAt = toDatetime(expiresAt);
    }

    const result = await this.alerts.createAlert({
      title,
      message,
      target_audience: targetType,
      target_type: targetType,
      target_id: targetId,
      target_age_min: targetAgeMin,
      target_age_max: targetAgeMax,
      created_by: this.getUserId(req),
      priority,
      expires_at: expiresAt,
    });

    if (result) {
      this.flash(req, 'success', 'اعلان با موفقیت منتشر شد.');
    } else {
      this.flash(req, 'error', 'خطا در ثبت اعلان.');
    }

    return this.redirect(res, '/admin/alerts');
  }

  /** POST /admin/alerts/delete/:id - JSON. */
  @Post('/admin/alerts/delete/:id')
  @Permissions('manage_alerts')
  async delete(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (req.method !== 'POST') {
      return this.json(res, { error: 'Method not allowed' }, 405);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid security token' }, 403);
    }

    const alertId = parseInt(id, 10);
    const result = await this.alerts.softDelete(alertId);

    if (result) {
      return this.json(res, { success: true });
    }
    return this.json(res, { error: 'Failed to delete alert' }, 500);
  }

  /** GET /my-alerts - players only. */
  @Get('/my-alerts')
  async myAlerts(@Req() req: Request, @Res() res: Response) {
    const user: any = this.getUser(req);

    if (user === null || user.role !== 'player') {
      return this.redirect(res, '/403');
    }

    const playerId = user.player_id ?? null;
    if (!playerId) {
      return this.redirect(res, '/player-panel');
    }

    const player = await this.alerts.findPlayer(playerId);
    if (player === null) {
      return this.redirect(res, '/player-panel');
    }

    const ageCategory = player.age_category ?? 'senior';
    const alerts = await this.alerts.getAlertsForPlayer(ageCategory);

    return this.render(req, res, 'alerts/my_alerts', {
      title: 'اعلانات من',
      alerts,
    });
  }
}
