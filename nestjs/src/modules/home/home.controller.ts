import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Public } from '../../common/decorators/permissions.decorator';
import { isAuthenticated } from '../../common/session/session.types';
import { UserRole } from '../../database/entities';

/**
 * Index / landing page.
 *
 * Guests get the club-emblem hero with the login CTA below it
 * (views/home/index.ejs); authenticated visitors are sent straight
 * to their own workspace instead.
 */
@Controller()
@Public()
export class HomeController extends BaseController {
  protected layout = 'layouts/auth';

  @Get('/')
  index(@Req() req: Request, @Res() res: Response): void {
    if (isAuthenticated(req)) {
      const role = req.session?.user_role;
      this.redirect(res, role === UserRole.PLAYER ? '/player-panel' : '/dashboard');
      return;
    }

    this.render(req, res, 'home/index', { title: 'Home' });
  }
}
