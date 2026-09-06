import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import {
  getSessionGuardianId,
  getSessionPlayerId,
  getSessionUserRole,
} from '../../common/session/session.types';
import { GuardianService } from '../domain/guardian.service';
import { MembershipCardService } from '../domain/membership-card.service';
import { PlayerDevelopmentService } from '../domain/player-development.service';
import { GuardianPanelService } from '../guardian/guardian-panel.service';
import {
  CLUB_DISPLAY_NAME,
  MEMBERSHIP_CARD_SIZE,
  PLAYER_POSITIONS,
  PREFERRED_FEET,
} from '../../config/constants';

/**
 * کارت عضویت (۸×۱۱ سانتی‌متر) و کارت بازی FIFA.
 *
 * Both cards are pure HTML + CSS — no graphics library, no headless browser
 * dependency. The membership card page is sized with `@page { size: 8cm 11cm }`
 * so «چاپ / ذخیره PDF» in the browser produces the exact physical card, and the
 * same markup is what the player and guardian see on screen.
 *
 * Access rules:
 *   • super_admin / secretary / accountant → any card
 *   • player                                → only their own
 *   • guardian                              → only their own children
 *   • coach                                 → no access (cards are not theirs)
 */
@Controller('/cards')
export class CardsController extends BaseController {
  protected layout = 'layouts/print';

  constructor(
    private readonly cards: MembershipCardService,
    private readonly guardians: GuardianService,
    private readonly development: PlayerDevelopmentService,
    private readonly reads: GuardianPanelService,
  ) {
    super();
  }

  private async mayAccess(req: Request, playerId: number): Promise<boolean> {
    const role = getSessionUserRole(req);
    if (role === 'super_admin' || role === 'secretary' || role === 'accountant') {
      return true;
    }
    if (role === 'player') {
      return getSessionPlayerId(req) === playerId;
    }
    if (role === 'guardian') {
      const guardianId = getSessionGuardianId(req);
      return guardianId !== null && (await this.guardians.owns(guardianId, playerId));
    }
    return false;
  }

  /** GET /cards/membership/:playerId — کارت عضویت آماده چاپ */
  @Get('/membership/:playerId')
  async membership(
    @Req() req: Request,
    @Res() res: Response,
    @Param('playerId') playerIdParam: string,
  ): Promise<void> {
    const playerId = parseInt(playerIdParam, 10);
    if (!(await this.mayAccess(req, playerId))) {
      return this.redirect(res, '/403');
    }

    const data = await this.cards.cardData(playerId);
    if (!data) {
      return this.redirect(res, '/404');
    }

    if (!this.cards.isEligible(data.player)) {
      return this.renderStandalone(req, res, 'cards/not_ready', {
        title: 'کارت عضویت',
        player: data.player,
      });
    }

    // Self-healing: an approved player without a card gets one on first view.
    const card = data.card ?? (await this.cards.issueFor(playerId, null));

    return this.renderStandalone(req, res, 'cards/membership', {
      title: `کارت عضویت ${data.player.name}`,
      player: data.player,
      card,
      club_name: CLUB_DISPLAY_NAME,
      size: MEMBERSHIP_CARD_SIZE,
      positions: PLAYER_POSITIONS,
    });
  }

  /** GET /cards/fifa/:playerId — کارت بازی به سبک FIFA */
  @Get('/fifa/:playerId')
  async fifa(
    @Req() req: Request,
    @Res() res: Response,
    @Param('playerId') playerIdParam: string,
  ): Promise<void> {
    const playerId = parseInt(playerIdParam, 10);
    if (!(await this.mayAccess(req, playerId))) {
      return this.redirect(res, '/403');
    }

    const player = await this.reads.playerDetail(playerId);
    if (!player) {
      return this.redirect(res, '/404');
    }

    const [attributes, overall, badges] = await Promise.all([
      this.development.fifaAttributes(playerId),
      this.development.fifaOverall(playerId),
      this.development.badgesOf(playerId),
    ]);

    return this.renderStandalone(req, res, 'cards/fifa', {
      title: `کارت بازی ${player.name}`,
      player,
      attributes,
      overall,
      badges,
      club_name: CLUB_DISPLAY_NAME,
      positions: PLAYER_POSITIONS,
      feet: PREFERRED_FEET,
    });
  }
}
