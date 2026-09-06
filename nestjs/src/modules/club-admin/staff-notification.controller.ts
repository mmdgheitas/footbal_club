import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { NotificationService } from '../domain/notification.service';
import { NotificationAudience } from '../../database/entities';
import { NOTIFICATION_ICONS, NOTIFICATION_TYPES } from '../../config/constants';

/**
 * اعلان‌های درون‌پنلی کارکنان (مدیر ارشد، مربی، حسابدار، منشی).
 * Players and guardians read theirs inside their own panels.
 */
@Controller('/notifications')
export class StaffNotificationController extends BaseController {
  constructor(private readonly notifications: NotificationService) {
    super();
  }

  private audience(req: Request): NotificationAudience {
    return this.getUserRole(req) === 'coach'
      ? NotificationAudience.COACH
      : NotificationAudience.ADMIN;
  }

  /** GET /notifications */
  @Get()
  async index(@Req() req: Request, @Res() res: Response): Promise<void> {
    const userId = this.getUserId(req)!;
    const audience = this.audience(req);

    return this.render(req, res, 'notifications/index', {
      title: 'اعلان‌ها',
      notifications: await this.notifications.list(audience, userId),
      types: NOTIFICATION_TYPES,
      icons: NOTIFICATION_ICONS,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /notifications/:id/read */
  @Post('/:id/read')
  async markRead(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/notifications');
    await this.notifications.markRead(parseInt(id, 10), this.audience(req), this.getUserId(req)!);
    return this.redirect(res, '/notifications');
  }

  /** POST /notifications/read-all */
  @Post('/read-all')
  async markAllRead(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) return this.redirect(res, '/notifications');
    await this.notifications.markAllRead(this.audience(req), this.getUserId(req)!);
    this.flash(req, 'success', 'همه اعلان‌ها خوانده‌شده علامت خوردند.');
    return this.redirect(res, '/notifications');
  }
}
