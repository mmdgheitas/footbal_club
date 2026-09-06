import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MembershipCard,
  MembershipCardStatus,
  Player,
  RegistrationStatus,
} from '../../database/entities';
import { MEMBERSHIP_CARD_PREFIX } from '../../config/constants';
import { JalaliHelper } from '../../common/helpers/jalali.helper';
import { toSqlDate, toSqlDateTime } from '../../common/helpers/time.helper';

/**
 * کارت عضویت دیجیتال.
 *
 * Issued automatically when a registration is approved; the card itself is a
 * plain HTML/CSS page sized 8cm × 11cm (views/cards/membership.ejs) that the
 * player or guardian can print or save as PDF straight from the browser.
 */
@Injectable()
export class MembershipCardService {
  constructor(
    @InjectRepository(MembershipCard)
    private readonly cards: Repository<MembershipCard>,
    @InjectRepository(Player)
    private readonly players: Repository<Player>,
  ) {}

  findActiveFor(playerId: number): Promise<MembershipCard | null> {
    return this.cards.findOne({
      where: { playerId, status: MembershipCardStatus.ACTIVE },
      order: { id: 'DESC' },
    });
  }

  findByNumber(cardNumber: string): Promise<MembershipCard | null> {
    return this.cards.findOne({ where: { cardNumber } });
  }

  list(): Promise<MembershipCard[]> {
    return this.cards.find({ order: { id: 'DESC' } });
  }

  /**
   * Issues a card for an approved player. Idempotent: an already-active card is
   * returned untouched, so re-approving never produces a duplicate.
   */
  async issueFor(
    playerId: number,
    issuedBy: number | null = null,
  ): Promise<MembershipCard | null> {
    const player = await this.players.findOne({ where: { id: playerId } });
    if (!player) {
      return null;
    }

    const existing = await this.findActiveFor(playerId);
    if (existing) {
      return existing;
    }

    const cardNumber = await this.nextCardNumber();
    const now = new Date();
    const issuedAt = toSqlDateTime(now);

    const card = await this.cards.save(
      this.cards.create({
        playerId,
        cardNumber,
        issuedAt,
        status: MembershipCardStatus.ACTIVE,
        issuedBy,
        pdfPath: null,
      }),
    );

    // Membership date is part of the printed card; set it on first issue.
    if (!player.membershipDate) {
      player.membershipDate = toSqlDate(now);
      await this.players.save(player);
    }

    return card;
  }

  async revoke(cardId: number): Promise<void> {
    await this.cards.update({ id: cardId }, { status: MembershipCardStatus.REVOKED });
  }

  /** NVB-<jalali year>-<6 digits>, e.g. NVB-1405-000042 */
  private async nextCardNumber(): Promise<string> {
    const jalaliYear = JalaliHelper.toJalaliString(new Date()).slice(0, 4);
    const count = await this.cards.count();
    let sequence = count + 1;
    // Guard against gaps/duplicates after manual deletions.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = `${MEMBERSHIP_CARD_PREFIX}-${jalaliYear}-${String(sequence).padStart(6, '0')}`;
      const clash = await this.cards.findOne({ where: { cardNumber: candidate } });
      if (!clash) {
        return candidate;
      }
      sequence += 1;
    }
  }

  /** Data block shared by the printable card and the panels. */
  async cardData(playerId: number): Promise<{
    player: Player;
    card: MembershipCard | null;
  } | null> {
    const player = await this.players.findOne({
      where: { id: playerId },
      relations: { classroom: true },
    });
    if (!player) {
      return null;
    }
    return { player, card: await this.findActiveFor(playerId) };
  }

  /** Only approved registrations may hold a card. */
  isEligible(player: Player): boolean {
    return player.registrationStatus === RegistrationStatus.APPROVED;
  }
}
