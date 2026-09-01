import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import { SecurityHelper } from '../../common/helpers/security.helper';

/**
 * Port of the authentication logic in app/Controllers/AuthController.php
 * and app/Models/User.php.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /**
   * Authenticates by email + password.
   * Returns the user (without the password hash) or null.
   */
  async attempt(email: string, password: string): Promise<User | null> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .getOne();

    if (!user) {
      return null;
    }

    // Legacy checks status == 1 (active) before accepting the login.
    if (Number(user.status) !== 1) {
      return null;
    }

    if (!SecurityHelper.verifyPassword(password, user.passwordHash)) {
      return null;
    }

    user.lastLogin = new Date();
    await this.users.save(user);

    return user;
  }

  /** Shape stored in $_SESSION['user'] by AuthMiddleware::login(). */
  toSessionUser(user: User) {
    return {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      player_id: user.playerId,
      status: user.status,
      document_status: user.documentStatus,
    };
  }
}
