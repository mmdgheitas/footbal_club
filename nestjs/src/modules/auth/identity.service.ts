import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentStatus,
  GuardianUser,
  Player,
  RegistrationStatus,
  User,
  UserRole,
} from '../../database/entities';
import { normalizePhone } from '../../common/helpers/phone.helper';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { ROLE_HOME, ROLES } from '../../config/constants';

export interface Identity {
  /** Which account table this identity comes from. */
  kind: 'staff' | 'guardian' | 'player';
  role: string;
  /** fc_users.id for staff/player, fc_guardians_users.id for guardian. */
  id: number;
  name: string;
  playerId: number | null;
  guardianId: number | null;
  home: string;
  roleLabel: string;
  icon: string;
}

export interface ResolveResult {
  identities: Identity[];
  /** Set when a matching account exists but may not sign in yet. */
  blocked: string | null;
}

const ROLE_ICONS: Record<string, string> = {
  super_admin: '👑',
  coach: '📋',
  accountant: '🧮',
  secretary: '🗂️',
  guardian: '👨‍👩‍👦',
  player: '⚽',
};

/**
 * تشخیص نقش از روی شماره موبایل — the single login page has no role selector;
 * after a successful OTP the system works out who the caller is:
 *
 *   fc_users (coach/admin/secretary/accountant) → پنل مربوطه
 *   fc_guardians_users                          → پنل ولی
 *   fc_players / fc_users(role=player)          → اپ بازیکن
 *   هیچ‌کدام                                     → پیام خطای مناسب
 *
 * One phone number may legitimately match more than one identity (a coach who
 * is also a parent); in that case the caller picks a panel once, after login.
 */
@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(GuardianUser) private readonly guardians: Repository<GuardianUser>,
    @InjectRepository(Player) private readonly players: Repository<Player>,
  ) {}

  async resolve(rawPhone: string): Promise<ResolveResult> {
    const phone = normalizePhone(rawPhone);
    const identities: Identity[] = [];
    let blocked: string | null = null;

    // --- 1. staff accounts -------------------------------------------------
    const staffUsers = await this.users.find({ where: { phone } });
    for (const user of staffUsers) {
      if (user.role === UserRole.PLAYER) {
        continue; // handled below, together with player files
      }
      if (Number(user.status) !== 1) {
        blocked = 'حساب کاربری شما غیرفعال است. با مدیریت باشگاه تماس بگیرید.';
        continue;
      }
      identities.push({
        kind: 'staff',
        role: user.role,
        id: user.id,
        name: user.name,
        playerId: user.playerId ?? null,
        guardianId: user.guardianId ?? null,
        home: ROLE_HOME[user.role] ?? '/dashboard',
        roleLabel: ROLES[user.role] ?? user.role,
        icon: ROLE_ICONS[user.role] ?? '👤',
      });
    }

    // --- 2. guardian accounts ---------------------------------------------
    const guardian = await this.guardians.findOne({ where: { phone } });
    if (guardian) {
      if (Number(guardian.status) !== 1) {
        blocked = 'حساب ولی غیرفعال است. با مدیریت باشگاه تماس بگیرید.';
      } else {
        identities.push({
          kind: 'guardian',
          role: 'guardian',
          id: guardian.id,
          name: guardian.name,
          playerId: null,
          guardianId: guardian.id,
          home: ROLE_HOME.guardian,
          roleLabel: ROLES.guardian,
          icon: ROLE_ICONS.guardian,
        });
      }
    }

    // --- 3. players --------------------------------------------------------
    // Either an fc_users row with role=player, or a player file carrying the
    // phone number (in which case the account is provisioned on first login).
    const playerUser = staffUsers.find((u) => u.role === UserRole.PLAYER) ?? null;
    let player: Player | null = null;

    if (playerUser?.playerId) {
      player = await this.players.findOne({ where: { id: playerUser.playerId } });
    }
    if (!player) {
      player = await this.players.findOne({ where: { phone } });
    }

    if (player) {
      if (player.registrationStatus !== RegistrationStatus.APPROVED) {
        blocked =
          player.registrationStatus === RegistrationStatus.INCOMPLETE
            ? 'پرونده ثبت‌نام شما ناقص است. لطفاً با منشی باشگاه تماس بگیرید.'
            : 'ثبت‌نام شما هنوز تأیید نشده است. پس از تأیید مدیریت می‌توانید وارد شوید.';
      } else {
        const account = playerUser ?? (await this.provisionPlayerAccount(player, phone));
        identities.push({
          kind: 'player',
          role: 'player',
          id: account.id,
          name: player.name,
          playerId: player.id,
          guardianId: null,
          home: ROLE_HOME.player,
          roleLabel: ROLES.player,
          icon: ROLE_ICONS.player,
        });
      }
    }

    return { identities, blocked: identities.length > 0 ? null : blocked };
  }

  /**
   * Players registered through the office have a player file but no login
   * account. The first successful OTP creates a minimal, password-less account
   * so the rest of the system (which keys off fc_users) keeps working.
   */
  private async provisionPlayerAccount(player: Player, phone: string): Promise<User> {
    const existing = await this.users.findOne({ where: { playerId: player.id } });
    if (existing) {
      if (!existing.phone) {
        existing.phone = phone;
        await this.users.save(existing);
      }
      return existing;
    }

    return this.users.save(
      this.users.create({
        uuid: uuidv4(),
        name: player.name,
        email: player.email || `player${player.id}@players.local`,
        phone,
        // Random hash: this account can only ever be entered with an OTP.
        passwordHash: SecurityHelper.hashPassword(uuidv4()),
        role: UserRole.PLAYER,
        playerId: player.id,
        status: 1,
        documentStatus: DocumentStatus.APPROVED,
      }),
    );
  }

  /** Session payload for the chosen identity. */
  async sessionUserFor(identity: Identity): Promise<Record<string, unknown>> {
    if (identity.kind === 'guardian') {
      return {
        id: identity.id,
        name: identity.name,
        email: '',
        phone: null,
        role: 'guardian',
        guardian_id: identity.id,
        player_id: null,
        status: 1,
      };
    }

    const user = await this.users.findOne({ where: { id: identity.id } });
    return {
      id: identity.id,
      uuid: user?.uuid,
      name: user?.name ?? identity.name,
      email: user?.email ?? '',
      phone: user?.phone ?? null,
      role: identity.role,
      player_id: identity.playerId,
      guardian_id: user?.guardianId ?? null,
      status: user?.status ?? 1,
      document_status: user?.documentStatus ?? null,
    };
  }

  async touchLastLogin(identity: Identity): Promise<void> {
    if (identity.kind === 'guardian') {
      await this.guardians.update({ id: identity.id }, { lastLogin: new Date() });
      return;
    }
    await this.users.update({ id: identity.id }, { lastLogin: new Date() });
  }
}
