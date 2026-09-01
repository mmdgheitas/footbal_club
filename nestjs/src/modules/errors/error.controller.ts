import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Public } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';

/**
 * Port of app/Controllers/ErrorController.php - the explicit 403/404 routes.
 *
 * The legacy controller overrides checkAuth() and isPublicRoute() so these
 * pages never trigger a login redirect; @Public() reproduces that.
 *
 * Both actions go through ErrorResponse::render(), which renders
 * errors/<code> inside the main layout with a real HTTP status code.
 */
@Controller()
export class ErrorController extends BaseController {
  @Get('/403')
  @Public()
  forbidden(@Req() req: Request, @Res() res: Response) {
    const message =
      SecurityHelper.sanitizeString(this.query(req, 'message') ?? '') ||
      'شما مجوز دسترسی به این بخش را ندارید.';

    // ErrorResponse::render(403, 'دسترسی غیرمجاز', $message)
    return this.render(
      req,
      res,
      'errors/403',
      {
        title: 'دسترسی غیرمجاز',
        code: 403,
        message,
      },
      403,
    );
  }

  @Get('/404')
  @Public()
  notFound(@Req() req: Request, @Res() res: Response) {
    // ErrorResponse::notFound()
    return this.render(
      req,
      res,
      'errors/404',
      {
        title: 'صفحه یافت نشد',
        code: 404,
        message: 'صفحه مورد نظر شما یافت نشد.',
      },
      404,
    );
  }
}
