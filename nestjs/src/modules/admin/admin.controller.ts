import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Roles } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { ROLES } from '../../config/constants';
import { AdminService } from './admin.service';

/** Strips tags like PHP's strip_tags(). */
function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Port of app/Controllers/AdminController.php (3 routes).
 * All three require the super_admin role.
 */
@Controller()
export class AdminController extends BaseController {
  constructor(private readonly admin: AdminService) {
    super();
  }

  /** GET /admin/users - RbacMiddleware::requireRole('super_admin') */
  @Get('/admin/users')
  @Roles('super_admin')
  async users(@Req() req: Request, @Res() res: Response) {
    const page = parseInt(String(this.query(req, 'page') ?? 1), 10) || 0;
    const role = SecurityHelper.sanitizeString(this.query(req, 'role') ?? '');

    const users = await this.admin.listUsers(page, role);

    return this.render(req, res, 'admin/users', {
      title: 'کاربران',
      users,
      roles: ROLES,
      selected_role: role,
    });
  }

  /** GET /admin/settings */
  @Get('/admin/settings')
  @Roles('super_admin')
  async settings(@Req() req: Request, @Res() res: Response) {
    const stored = await this.admin.getAllKeyed();

    return this.render(req, res, 'admin/settings', {
      title: 'تنظیمات',
      settings: stored,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/settings */
  @Post('/admin/settings')
  @Roles('super_admin')
  async updateSettings(@Req() req: Request, @Res() res: Response) {
    if (req.method !== 'POST') {
      return this.json(res, { error: 'روش درخواست مجاز نیست.' }, 405);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'نشست شما منقضی شده است؛ صفحه را تازه کنید.' }, 403);
    }

    const allowedKeys = [
      'app_name',
      'attendance_warning_threshold',
      'max_upload_size',
      'sms_provider',
    ];

    const toSave: Record<string, string> = {};
    for (const key of allowedKeys) {
      const value = this.post(req, key);
      if (value === null || value === undefined || Array.isArray(value)) {
        continue;
      }
      toSave[key] = stripTags(String(value)).trim();
    }

    // 'log' is not a supported provider; the legacy rewrites it to 'mock'.
    if (toSave.sms_provider !== undefined && toSave.sms_provider === 'log') {
      toSave.sms_provider = 'mock';
    }

    if (toSave.attendance_warning_threshold !== undefined) {
      const threshold = parseInt(toSave.attendance_warning_threshold, 10) || 0;
      toSave.attendance_warning_threshold = String(
        Math.max(0, Math.min(100, threshold)),
      );
    }

    if (toSave.max_upload_size !== undefined) {
      toSave.max_upload_size = String(
        Math.max(1024, parseInt(toSave.max_upload_size, 10) || 0),
      );
    }

    if (Object.keys(toSave).length === 0) {
      return this.json(res, { error: 'تنظیمی برای ذخیره وجود ندارد.' }, 422);
    }

    try {
      await this.admin.setMany(toSave);
    } catch {
      return this.json(res, { error: 'ذخیره تنظیمات انجام نشد.' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'تنظیمات با موفقیت ذخیره شد.',
    });
  }
}
