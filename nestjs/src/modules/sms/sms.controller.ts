import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { SMS_PROVIDER } from '../../config/constants';
import { SmsService } from './sms.service';

/** PHP strip_tags(). */
function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Port of app/Controllers/SmsController.php (3 routes).
 */
@Controller()
export class SmsController extends BaseController {
  constructor(private readonly sms: SmsService) {
    super();
  }

  /** GET /sms/send - RbacMiddleware::requirePermission('send_sms') */
  @Get('/sms/send')
  @Permissions('send_sms')
  async index(@Req() req: Request, @Res() res: Response) {
    const players = await this.sms.getActivePlayers();

    return this.render(req, res, 'sms/index', {
      title: 'ارسال پیامک',
      players,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /sms/send */
  @Post('/sms/send')
  @Permissions('send_sms')
  async send(@Req() req: Request, @Res() res: Response) {
    if (req.method !== 'POST') {
      return this.json(res, { error: 'Method not allowed' }, 405);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    let recipients: any = this.post(req, 'recipients') ?? [];
    if (!Array.isArray(recipients)) {
      recipients =
        recipients !== '' && recipients !== null ? [String(recipients)] : [];
    }
    const message = stripTags(String(this.post(req, 'message') ?? '')).trim();
    const smsType = SecurityHelper.sanitizeString(
      this.post(req, 'sms_type') ?? 'general',
    );

    if (recipients.length === 0) {
      return this.json(res, { error: 'Please select at least one recipient' }, 422);
    }

    if (!message) {
      return this.json(res, { error: 'Message cannot be empty' }, 422);
    }

    // PHP strlen() counts BYTES, so Persian text hits this limit much sooner
    // than 160 characters would. Preserved deliberately.
    if (Buffer.byteLength(message, 'utf8') > 160) {
      return this.json(res, { error: 'Message exceeds 160 characters' }, 422);
    }

    const provider = await this.sms.getProvider();

    let sentCount = 0;
    let failedCount = 0;
    let skippedNoPhone = 0;

    for (const recipient of recipients) {
      const playerId = parseInt(String(recipient), 10) || 0;
      const player = await this.sms.findPlayer(playerId);

      if (player === null) {
        failedCount++;
        continue;
      }

      const guardians = await this.sms.getGuardiansByPlayerId(playerId);
      let hasPhone = false;

      for (const guardian of guardians) {
        if (!guardian.phone) {
          continue;
        }

        hasPhone = true;
        const result = await provider.send(guardian.phone, message);

        if (result.success) {
          await this.sms.logSms({
            player_id: playerId,
            recipient_phone: guardian.phone,
            message,
            sms_type: smsType,
            provider: SMS_PROVIDER,
            provider_message_id: result.message_id,
            status: 'sent',
          });
          sentCount++;
        } else {
          await this.sms.logSms({
            player_id: playerId,
            recipient_phone: guardian.phone,
            message,
            sms_type: smsType,
            provider: SMS_PROVIDER,
            status: 'failed',
            error_message: result.error,
          });
          failedCount++;
        }
      }

      if (!hasPhone) {
        skippedNoPhone++;
      }
    }

    if (sentCount === 0 && failedCount === 0) {
      return this.json(
        res,
        {
          error:
            skippedNoPhone > 0
              ? 'برای بازیکنان انتخاب‌شده شماره ولی ثبت نشده است.'
              : 'هیچ گیرنده‌ای انتخاب نشده است.',
        },
        422,
      );
    }

    return this.json(res, {
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      message: `ارسال موفق: ${sentCount} — ناموفق: ${failedCount}`,
    });
  }

  /** GET /sms/logs */
  @Get('/sms/logs')
  @Permissions('send_sms')
  async logs(@Req() req: Request, @Res() res: Response) {
    const page = parseInt(String(this.query(req, 'page') ?? 1), 10) || 0;
    const filter = SecurityHelper.sanitizeString(this.query(req, 'filter') ?? 'all');

    const logs = await this.sms.listLogs(page, filter);

    return this.render(req, res, 'sms/logs', {
      title: 'گزارش پیامک‌ها',
      logs,
      filter,
    });
  }
}
