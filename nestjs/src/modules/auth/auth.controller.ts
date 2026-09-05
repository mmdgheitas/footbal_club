import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BaseController } from '../../common/views/base.controller';
import { GuestOnly, Public } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { JalaliHelper } from '../../common/helpers/jalali.helper';
import { PlayerHelper } from '../../common/helpers/player.helper';
import {
  AgeCategory,
  DocumentStatus,
  Player,
  PlayerPosition,
  User,
  UserRole,
} from '../../database/entities';
import { PLAYER_POSITIONS } from '../../config/constants';
import { AuthService } from './auth.service';

/**
 * Port of app/Controllers/AuthController.php.
 * Route paths, validation order, flash messages and redirects are unchanged.
 */
@Controller()
@Public()
export class AuthController extends BaseController {
  protected layout = 'layouts/auth';

  constructor(
    private readonly auth: AuthService,
    @InjectRepository(Player) private readonly players: Repository<Player>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  // NOTE: '/' is owned by HomeController (the landing page); it redirects
  // authenticated visitors on to their workspace. '/login' stays here.
  @Get('/login')
  @GuestOnly()
  login(@Req() req: Request, @Res() res: Response): void {
    this.render(req, res, 'auth/login', { title: 'Login', csrf_token: this.generateCsrf(req) });
  }

  @Post('/login')
  @GuestOnly()
  async authenticate(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'Invalid security token. Please try again.');
      this.redirect(res, '/login');
      return;
    }

    const email = String(this.post(req, 'email') ?? '').trim();
    const password = String(this.post(req, 'password') ?? '');

    if (!email || !password) {
      this.flash(req, 'error', 'Email and password are required.');
      this.redirect(res, '/login');
      return;
    }

    if (!SecurityHelper.validateEmail(email)) {
      this.flash(req, 'error', 'Invalid email address.');
      this.redirect(res, '/login');
      return;
    }

    const user = await this.auth.attempt(email, password);

    if (user === null) {
      this.flash(req, 'error', 'Invalid email or password.');
      this.redirect(res, '/login');
      return;
    }

    if (Number(user.status) !== 1) {
      this.flash(req, 'error', 'Your account has been disabled.');
      this.redirect(res, '/login');
      return;
    }

    // Player accounts may not log in until their documents are approved.
    if (user.role === UserRole.PLAYER && user.documentStatus !== DocumentStatus.APPROVED) {
      this.flash(
        req,
        'error',
        'اسناد شما هنوز تأیید نشده است. لطفاً منتظر بمانید یا اسناد را آپلود کنید.',
      );
      this.redirect(res, '/login');
      return;
    }

    const sessionUser = this.auth.toSessionUser(user);
    const ip = SecurityHelper.getClientIp(req);
    const userAgent = (req.headers['user-agent'] as string) ?? '';

    // Regenerate the session id to prevent session fixation, then log in.
    req.session.regenerate((err) => {
      if (err) {
        this.flash(req, 'error', 'An error occurred. Please try again.');
        this.redirect(res, '/login');
        return;
      }
      const s = req.session as any;
      s.user_id = sessionUser.id;
      s.user_role = sessionUser.role;
      s.user = sessionUser;
      s.login_time = Date.now();
      s.ip_address = ip;
      s.user_agent = userAgent;

      this.flash(req, 'success', `Welcome back, ${sessionUser.name}!`);

      s.save(() => {
        this.redirect(res, sessionUser.role === UserRole.PLAYER ? '/player-panel' : '/dashboard');
      });
    });
  }

  @Get('/register')
  @GuestOnly()
  register(@Req() req: Request, @Res() res: Response): void {
    this.render(req, res, 'auth/register', {
      title: 'Register',
      csrf_token: this.generateCsrf(req),
    });
  }

  @Post('/register')
  @GuestOnly()
  async store(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.validateCsrf(req)) {
      this.flash(req, 'error', 'Invalid security token. Please try again.');
      this.redirect(res, '/register');
      return;
    }

    const name = String(this.post(req, 'name') ?? '').trim();
    const email = String(this.post(req, 'email') ?? '').trim();
    const password = String(this.post(req, 'password') ?? '');
    const confirmPassword = String(this.post(req, 'password_confirmation') ?? '');

    const dateOfBirthJalali = String(this.post(req, 'date_of_birth') ?? '').trim();
    const nationalId = String(this.post(req, 'national_id') ?? '').trim();
    const phone = String(this.post(req, 'phone') ?? '').trim();
    const position = String(this.post(req, 'position') ?? '');

    const dateOfBirth = JalaliHelper.toGregorianString(dateOfBirthJalali);

    const errors: string[] = [];

    if (!name) {
      errors.push('Name is required.');
    }

    if (!email) {
      errors.push('Email is required.');
    } else if (!SecurityHelper.validateEmail(email)) {
      errors.push('Invalid email address.');
    } else if (await this.users.findOne({ where: { email } })) {
      errors.push('Email already registered.');
    }

    if (!password) {
      errors.push('Password is required.');
    } else {
      const validation = SecurityHelper.validatePasswordStrength(password);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    if (password !== confirmPassword) {
      errors.push('Passwords do not match.');
    }

    if (!dateOfBirthJalali) {
      errors.push('Date of birth is required.');
    } else if (!dateOfBirth) {
      errors.push('Invalid date of birth format. Please use YYYY/MM/DD.');
    }

    if (!nationalId) {
      errors.push('National ID is required.');
    } else if (await this.players.findOne({ where: { nationalId } })) {
      errors.push('National ID already registered.');
    }

    if (!position) {
      errors.push('Position is required.');
    } else if (!Object.prototype.hasOwnProperty.call(PLAYER_POSITIONS, position)) {
      errors.push('Invalid position.');
    }

    if (errors.length > 0) {
      for (const error of errors) {
        this.flash(req, 'error', error);
      }
      this.redirect(res, '/register');
      return;
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        const player = manager.create(Player, {
          uuid: uuidv4(),
          name,
          dateOfBirth,
          nationalId,
          position: position as PlayerPosition,
          ageCategory: PlayerHelper.getAgeCategory(dateOfBirth) as AgeCategory,
          phone: phone || null,
          email: email || null,
          medicalClearance: 0, // Not cleared until documents are approved
          status: 1,
        });
        const savedPlayer = await manager.save(player);

        const user = manager.create(User, {
          uuid: uuidv4(),
          name,
          email,
          phone: phone || null,
          passwordHash: SecurityHelper.hashPassword(password),
          role: UserRole.PLAYER,
          playerId: savedPlayer.id,
          status: 0, // Inactive until documents are approved
          documentStatus: DocumentStatus.PENDING,
        });
        await manager.save(user);
      });
    } catch {
      this.flash(req, 'error', 'An error occurred during registration. Please try again.');
      this.redirect(res, '/register');
      return;
    }

    this.flash(
      req,
      'success',
      'Account created successfully! Please upload your documents for approval.',
    );
    this.redirect(res, '/login');
  }

  @Get('/logout')
  logout(@Req() req: Request, @Res() res: Response): void {
    req.session.destroy(() => {
      // NOTE: matches the legacy behaviour — AuthMiddleware::logout() destroys
      // the session before flash() runs, so this message does not survive to
      // the next request in either implementation.
      this.flash(req, 'success', 'You have been logged out successfully.');
      this.redirect(res, '/login');
    });
  }
}
