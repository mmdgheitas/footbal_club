import { Injectable } from '@nestjs/common';
import { NotificationAudience, NotificationType } from '../../database/entities';
import { LedgerService } from './ledger.service';
import { NotificationService } from './notification.service';
import { GuardianService } from './guardian.service';
import { toYearMonth } from '../../common/helpers/time.helper';

/**
 * اعلان درون‌پنلی هوشمند بدهی.
 *
 * Runs on demand (guardian panel load, admin debtors report) rather than on a
 * timer, so no scheduler is required. `dedupeKey` contains the current month
 * and the current debt amount, which means:
 *   • one reminder per month per family, and
 *   • a fresh reminder as soon as the amount changes.
 */
@Injectable()
export class DebtNotifierService {
  constructor(
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationService,
    private readonly guardians: GuardianService,
  ) {}

  private static month(): string {
    return toYearMonth();
  }

  private static format(amount: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(amount));
  }

  /** Creates (at most one) debt reminder for a guardian and their children. */
  async syncGuardian(guardianId: number): Promise<number> {
    const playerIds = await this.guardians.playerIdsOf(guardianId);
    if (playerIds.length === 0) {
      return 0;
    }

    const summary = await this.ledger.guardianLedger(playerIds);
    if (summary.totalOutstanding <= 0) {
      return 0;
    }

    const names = summary.ledgers
      .filter((l) => l.hasDebt)
      .map((l) => l.playerName)
      .join('، ');

    await this.notifications.create({
      userType: NotificationAudience.GUARDIAN,
      userId: guardianId,
      title: 'یادآوری بدهی شهریه',
      message: `مبلغ ${DebtNotifierService.format(summary.totalOutstanding)} تومان بدهی پرداخت‌نشده برای ${names} ثبت شده است. لطفاً از بخش دفترچه مالی پیگیری کنید.`,
      type: NotificationType.DEBT,
      link: '/guardian/financial',
      dedupeKey: `debt:g${guardianId}:${DebtNotifierService.month()}:${Math.round(summary.totalOutstanding)}`,
    });

    return summary.totalOutstanding;
  }

  /** Same reminder, addressed to the player's own panel. */
  async syncPlayer(playerId: number): Promise<number> {
    const outstanding = await this.ledger.outstandingFor(playerId);
    if (outstanding <= 0) {
      return 0;
    }

    await this.notifications.create({
      userType: NotificationAudience.PLAYER,
      userId: playerId,
      title: 'بدهی شهریه',
      message: `مبلغ ${DebtNotifierService.format(outstanding)} تومان بدهی پرداخت‌نشده دارید.`,
      type: NotificationType.DEBT,
      link: '/app/profile',
      dedupeKey: `debt:p${playerId}:${DebtNotifierService.month()}:${Math.round(outstanding)}`,
    });

    return outstanding;
  }

  /** Admin action: push a reminder to every family that owes money. */
  async syncAll(): Promise<number> {
    const debtors = await this.ledger.debtors();
    const guardianIds = [...new Set(debtors.map((d) => d.guardian_id).filter(Boolean))] as number[];
    for (const id of guardianIds) {
      await this.syncGuardian(id);
    }
    for (const debtor of debtors) {
      await this.syncPlayer(debtor.player_id);
    }
    return debtors.length;
  }
}
