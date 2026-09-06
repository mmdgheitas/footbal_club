import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentStatus,
  MembershipCard,
  NotificationAudience,
  NotificationType,
  Player,
  RegistrationStatus,
  User,
  UserRole,
} from '../../database/entities';
import { MembershipCardService } from './membership-card.service';
import { NotificationService } from './notification.service';
import { GuardianService } from './guardian.service';
import { REGISTRATION_STATUSES } from '../../config/constants';

export interface RegistrationRow {
  player: Player;
  user: User | null;
  guardianName: string | null;
  guardianPhone: string | null;
  documents: number;
}

/**
 * گردش‌کار ثبت‌نام: pending → approved / incomplete.
 *
 * Approval is the single event that:
 *   1. flips fc_players.registration_status to `approved`,
 *   2. activates the player's login account,
 *   3. **issues the membership card automatically**, and
 *   4. notifies the player and their guardian in-panel.
 *
 * Only the super admin may call it (enforced on the controller with
 * @Roles('super_admin') — a coach can never approve a registration).
 */
@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(Player) private readonly players: Repository<Player>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly cards: MembershipCardService,
    private readonly notifications: NotificationService,
    private readonly guardians: GuardianService,
  ) {}

  /** Registrations grouped for the admin review screen. */
  async list(status?: RegistrationStatus | string): Promise<RegistrationRow[]> {
    const qb = this.players
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.classroom', 'c')
      .where('p.deletedAt IS NULL')
      .orderBy('p.createdAt', 'DESC');

    if (status) {
      qb.andWhere('p.registrationStatus = :status', { status });
    }

    const players = await qb.getMany();
    const rows: RegistrationRow[] = [];

    for (const player of players) {
      const user = await this.users.findOne({ where: { playerId: player.id } });
      const guardian = await this.guardians.guardianOfPlayer(player.id);
      rows.push({
        player,
        user,
        guardianName: guardian?.name ?? null,
        guardianPhone: guardian?.phone ?? null,
        documents: 0,
      });
    }

    return rows;
  }

  counts(): Promise<Array<{ status: string; label: string; count: number }>> {
    return this.players
      .createQueryBuilder('p')
      .select('p.registration_status', 'status')
      .addSelect('COUNT(p.id)', 'count')
      .where('p.deletedAt IS NULL')
      .groupBy('p.registration_status')
      .getRawMany()
      .then((rows) =>
        rows.map((r: any) => ({
          status: r.status,
          label: REGISTRATION_STATUSES[r.status] ?? r.status,
          count: Number(r.count ?? 0),
        })),
      );
  }

  /** تأیید ثبت‌نام + صدور خودکار کارت عضویت. */
  async approve(
    playerId: number,
    adminUserId: number | null,
  ): Promise<{ player: Player; card: MembershipCard | null } | null> {
    const player = await this.players.findOne({ where: { id: playerId } });
    if (!player) {
      return null;
    }

    player.registrationStatus = RegistrationStatus.APPROVED;
    player.status = 1;
    if (!player.membershipDate) {
      player.membershipDate = new Date().toISOString().slice(0, 10);
    }
    await this.players.save(player);

    // The linked login account becomes usable at the same moment.
    const user = await this.users.findOne({ where: { playerId } });
    if (user) {
      user.status = 1;
      user.documentStatus = DocumentStatus.APPROVED;
      user.approvedBy = adminUserId;
      user.approvedAt = new Date();
      user.rejectionReason = null;
      await this.users.save(user);
    }

    // صدور خودکار کارت عضویت
    const card = await this.cards.issueFor(playerId, adminUserId);

    await this.notifyPlayerAndGuardian(player, {
      title: 'ثبت‌نام تأیید شد 🎉',
      message: `ثبت‌نام ${player.name} تأیید شد و کارت عضویت دیجیتال به شماره ${card?.cardNumber ?? '—'} صادر گردید.`,
      type: NotificationType.REGISTRATION,
      dedupeKey: `registration-approved:${playerId}`,
    });

    return { player, card };
  }

  /** رد / ناقص اعلام کردن ثبت‌نام. */
  async markIncomplete(
    playerId: number,
    reason: string,
    adminUserId: number | null,
  ): Promise<Player | null> {
    const player = await this.players.findOne({ where: { id: playerId } });
    if (!player) {
      return null;
    }

    player.registrationStatus = RegistrationStatus.INCOMPLETE;
    await this.players.save(player);

    const user = await this.users.findOne({ where: { playerId } });
    if (user) {
      user.documentStatus = DocumentStatus.REJECTED;
      user.rejectionReason = reason;
      user.status = 0;
      user.approvedBy = adminUserId;
      await this.users.save(user);
    }

    await this.notifyPlayerAndGuardian(player, {
      title: 'ثبت‌نام ناقص است',
      message: `پرونده ${player.name} ناقص اعلام شد. دلیل: ${reason}`,
      type: NotificationType.REGISTRATION,
      dedupeKey: null,
    });

    return player;
  }

  /** بازگرداندن به حالت در انتظار بررسی. */
  async markPending(playerId: number): Promise<void> {
    await this.players.update(
      { id: playerId },
      { registrationStatus: RegistrationStatus.PENDING },
    );
  }

  private async notifyPlayerAndGuardian(
    player: Player,
    payload: {
      title: string;
      message: string;
      type: NotificationType;
      dedupeKey: string | null;
    },
  ): Promise<void> {
    await this.notifications.create({
      userType: NotificationAudience.PLAYER,
      userId: player.id,
      link: '/app/profile',
      ...payload,
    });

    const guardian = await this.guardians.guardianOfPlayer(player.id);
    if (guardian) {
      await this.notifications.create({
        userType: NotificationAudience.GUARDIAN,
        userId: guardian.id,
        link: `/guardian/player/${player.id}`,
        ...payload,
        dedupeKey: payload.dedupeKey ? `${payload.dedupeKey}:g${guardian.id}` : null,
      });
    }
  }

  /** Super admins, used to fan notifications out to the review queue. */
  async adminIds(): Promise<number[]> {
    const admins = await this.users.find({
      where: { role: UserRole.SUPER_ADMIN, status: 1 },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }
}
