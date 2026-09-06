import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Notification,
  NotificationAudience,
  NotificationType,
} from '../../database/entities';

export interface CreateNotificationInput {
  userType: NotificationAudience | string;
  userId: number;
  title: string;
  message: string;
  type?: NotificationType | string;
  link?: string | null;
  /** When set, the notification is created only once for that key. */
  dedupeKey?: string | null;
}

/**
 * اعلان‌های درون‌پنلی — in-panel notifications only.
 *
 * There is deliberately no push/webpush/FCM path anywhere in the system: the
 * brief asks for in-panel notifications and nothing else. Notifications are
 * addressed by (user_type, user_id) so the same table serves staff accounts
 * (fc_users), guardian accounts (fc_guardians_users) and players.
 */
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification | null> {
    if (input.dedupeKey) {
      const existing = await this.repo.findOne({
        where: { dedupeKey: input.dedupeKey },
      });
      if (existing) {
        return existing;
      }
    }

    const notification = this.repo.create({
      userType: input.userType as NotificationAudience,
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: (input.type ?? NotificationType.SYSTEM) as NotificationType,
      link: input.link ?? null,
      dedupeKey: input.dedupeKey ?? null,
      isRead: 0,
    });
    return this.repo.save(notification);
  }

  /** Fan-out helper used when several people must hear about one event. */
  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    for (const input of inputs) {
      await this.create(input);
    }
  }

  list(
    userType: NotificationAudience | string,
    userId: number,
    limit = 50,
  ): Promise<Notification[]> {
    return this.repo.find({
      where: { userType: userType as NotificationAudience, userId },
      order: { isRead: 'ASC', createdAt: 'DESC' },
      take: limit,
    });
  }

  unreadCount(
    userType: NotificationAudience | string,
    userId: number,
  ): Promise<number> {
    return this.repo.count({
      where: { userType: userType as NotificationAudience, userId, isRead: 0 },
    });
  }

  async markRead(
    id: number,
    userType: NotificationAudience | string,
    userId: number,
  ): Promise<void> {
    await this.repo.update(
      { id, userType: userType as NotificationAudience, userId },
      { isRead: 1 },
    );
  }

  async markAllRead(
    userType: NotificationAudience | string,
    userId: number,
  ): Promise<void> {
    await this.repo.update(
      { userType: userType as NotificationAudience, userId, isRead: 0 },
      { isRead: 1 },
    );
  }

  /** Notifies every super admin (used for registrations awaiting review). */
  async notifyAdmins(
    adminIds: number[],
    input: Omit<CreateNotificationInput, 'userId' | 'userType'>,
  ): Promise<void> {
    for (const id of adminIds) {
      await this.create({
        ...input,
        userType: NotificationAudience.ADMIN,
        userId: id,
        dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${id}` : null,
      });
    }
  }

  async deleteFor(
    userType: NotificationAudience | string,
    userIds: number[],
  ): Promise<void> {
    if (userIds.length === 0) return;
    await this.repo.delete({
      userType: userType as NotificationAudience,
      userId: In(userIds),
    });
  }
}
