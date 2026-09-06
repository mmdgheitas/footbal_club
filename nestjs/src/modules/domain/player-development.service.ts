import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Player,
  PlayerBadge,
  PlayerPerformance,
  PlayerScore,
  MatchType,
} from '../../database/entities';
import { BADGES, PERFORMANCE_TYPES } from '../../config/constants';

export interface PerformanceSummaryRow {
  type: string;
  label: string;
  icon: string;
  total: number;
  events: number;
}

/**
 * امتیاز، نشان و عملکرد بازیکن.
 *
 * Rules straight from the brief:
 *   • امتیاز بازیکن = جمع سادهٔ تمام امتیازهای ثبت‌شده (no weighting).
 *   • امتیاز را مربی یا مدیر ارشد ثبت می‌کند.
 *   • نشان‌ها فقط توسط مدیر ارشد قابل تعیین هستند — enforced in assignBadge().
 */
@Injectable()
export class PlayerDevelopmentService {
  constructor(
    @InjectRepository(PlayerScore)
    private readonly scores: Repository<PlayerScore>,
    @InjectRepository(PlayerBadge)
    private readonly badges: Repository<PlayerBadge>,
    @InjectRepository(PlayerPerformance)
    private readonly performances: Repository<PlayerPerformance>,
    @InjectRepository(Player)
    private readonly players: Repository<Player>,
  ) {}

  // ---------------------------------------------------------------- scores

  /** Adds points. Allowed roles: coach (own class) and super_admin. */
  async addScore(input: {
    playerId: number;
    points: number;
    reason?: string | null;
    sessionDate?: string | null;
    scoredBy: number | null;
    role: string | null;
  }): Promise<PlayerScore> {
    if (input.role !== 'coach' && input.role !== 'super_admin') {
      throw new ForbiddenException('ثبت امتیاز فقط توسط مربی یا مدیر ارشد ممکن است.');
    }

    const score = await this.scores.save(
      this.scores.create({
        playerId: input.playerId,
        points: Math.trunc(input.points),
        reason: input.reason ?? null,
        sessionDate: input.sessionDate ?? null,
        scoredBy: input.scoredBy,
      }),
    );

    await this.recalculateTotal(input.playerId);
    return score;
  }

  /** جمع ساده — plain SUM over fc_player_scores. */
  async totalScore(playerId: number): Promise<number> {
    const row = await this.scores
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.points), 0)', 'total')
      .where('s.playerId = :playerId', { playerId })
      .getRawOne<{ total: string | number }>();
    return Number(row?.total ?? 0);
  }

  /** Writes the plain sum back into the cached fc_players.total_score column. */
  async recalculateTotal(playerId: number): Promise<number> {
    const total = await this.totalScore(playerId);
    await this.players.update({ id: playerId }, { totalScore: total });
    return total;
  }

  scoreHistory(playerId: number, limit = 100): Promise<PlayerScore[]> {
    return this.scores.find({
      where: { playerId },
      relations: { scorer: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });
  }

  /** Ranking used by the «افتخارات» tab and the admin reports. */
  async leaderboard(
    limit = 20,
    playerIds: number[] | null = null,
  ): Promise<Array<{ id: number; name: string; total: number; classroom: string | null }>> {
    const qb = this.players
      .createQueryBuilder('p')
      .leftJoin('p.classroom', 'c')
      .select(['p.id AS id', 'p.name AS name', 'p.total_score AS total', 'c.name AS classroom'])
      .where('p.deletedAt IS NULL')
      .orderBy('p.total_score', 'DESC')
      .addOrderBy('p.name', 'ASC')
      .limit(limit);

    if (playerIds && playerIds.length > 0) {
      qb.andWhere('p.id IN (:...playerIds)', { playerIds });
    }

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      total: Number(r.total ?? 0),
      classroom: r.classroom ?? null,
    }));
  }

  /** 1-based rank of a player among all players. */
  async rankOf(playerId: number): Promise<{ rank: number; outOf: number }> {
    const player = await this.players.findOne({ where: { id: playerId } });
    const outOf = await this.players.count();
    if (!player) {
      return { rank: 0, outOf };
    }
    const better = await this.players
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL')
      .andWhere('p.total_score > :score', { score: player.totalScore ?? 0 })
      .getCount();
    return { rank: better + 1, outOf };
  }

  // ---------------------------------------------------------------- badges

  /** نشان‌ها فقط توسط مدیر ارشد — hard rule, checked twice (route + service). */
  async assignBadge(input: {
    playerId: number;
    badgeKey: string;
    note?: string | null;
    assignedBy: number | null;
    role: string | null;
  }): Promise<PlayerBadge> {
    if (input.role !== 'super_admin') {
      throw new ForbiddenException('تعیین نشان فقط در اختیار مدیر ارشد است.');
    }
    const definition = BADGES[input.badgeKey];
    if (!definition) {
      throw new ForbiddenException('نشان انتخاب‌شده معتبر نیست.');
    }

    const existing = await this.badges.findOne({
      where: { playerId: input.playerId, badgeKey: input.badgeKey },
    });
    if (existing) {
      return existing;
    }

    return this.badges.save(
      this.badges.create({
        playerId: input.playerId,
        badgeKey: input.badgeKey,
        badgeTitle: definition.title,
        note: input.note ?? null,
        assignedBy: input.assignedBy,
      }),
    );
  }

  async removeBadge(id: number, role: string | null): Promise<void> {
    if (role !== 'super_admin') {
      throw new ForbiddenException('حذف نشان فقط در اختیار مدیر ارشد است.');
    }
    await this.badges.delete({ id });
  }

  async badgesOf(playerId: number): Promise<
    Array<PlayerBadge & { icon: string; description: string }>
  > {
    const rows = await this.badges.find({
      where: { playerId },
      order: { assignedAt: 'DESC' },
    });
    return rows.map((b) =>
      Object.assign(b, {
        icon: BADGES[b.badgeKey]?.icon ?? '🏅',
        description: BADGES[b.badgeKey]?.description ?? '',
      }),
    );
  }

  // ----------------------------------------------------------- performance

  async recordPerformance(input: {
    playerId: number;
    type: string;
    value?: number;
    description?: string | null;
    matchType?: string | null;
    sessionDate?: string | null;
    recordedBy: number | null;
    role: string | null;
    /** Also grant the suggested points for this event type. */
    withScore?: boolean;
  }): Promise<PlayerPerformance> {
    if (input.role !== 'coach' && input.role !== 'super_admin') {
      throw new ForbiddenException('ثبت عملکرد فقط توسط مربی یا مدیر ارشد ممکن است.');
    }
    const definition = PERFORMANCE_TYPES[input.type];
    if (!definition) {
      throw new ForbiddenException('نوع عملکرد معتبر نیست.');
    }

    const value = Math.max(1, Math.trunc(input.value ?? 1));
    const record = await this.performances.save(
      this.performances.create({
        playerId: input.playerId,
        type: input.type,
        value,
        description: input.description ?? null,
        matchType: (input.matchType ?? MatchType.TRAINING) as MatchType,
        sessionDate: input.sessionDate ?? null,
        recordedBy: input.recordedBy,
      }),
    );

    if (input.withScore !== false && definition.suggestedPoints !== 0) {
      await this.addScore({
        playerId: input.playerId,
        points: definition.suggestedPoints * value,
        reason: `${definition.label} (${value})`,
        sessionDate: input.sessionDate ?? null,
        scoredBy: input.recordedBy,
        role: input.role,
      });
    }

    return record;
  }

  performanceHistory(playerId: number, limit = 100): Promise<PlayerPerformance[]> {
    return this.performances.find({
      where: { playerId },
      relations: { recorder: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });
  }

  /** Totals per event type — powers the «گزارش‌ها» tab and the FIFA card. */
  async performanceSummary(playerId: number): Promise<PerformanceSummaryRow[]> {
    const rows = await this.performances
      .createQueryBuilder('p')
      .select('p.type', 'type')
      .addSelect('SUM(p.value)', 'total')
      .addSelect('COUNT(p.id)', 'events')
      .where('p.playerId = :playerId', { playerId })
      .groupBy('p.type')
      .getRawMany();

    return rows.map((r) => ({
      type: r.type,
      label: PERFORMANCE_TYPES[r.type]?.label ?? r.type,
      icon: PERFORMANCE_TYPES[r.type]?.icon ?? '📊',
      total: Number(r.total ?? 0),
      events: Number(r.events ?? 0),
    }));
  }

  /** Coach feedback entries (type = feedback) shown to player and guardian. */
  feedbackFor(playerId: number, limit = 20): Promise<PlayerPerformance[]> {
    return this.performances.find({
      where: { playerId, type: 'feedback' },
      relations: { recorder: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * FIFA-card attribute ratings (0-99), derived from recorded performance so the
   * card means something without asking anyone to type ratings by hand.
   */
  async fifaAttributes(playerId: number): Promise<Record<string, number>> {
    const summary = await this.performanceSummary(playerId);
    const totalOf = (type: string): number =>
      summary.find((s) => s.type === type)?.total ?? 0;

    const clamp = (n: number): number => Math.max(40, Math.min(99, Math.round(n)));
    const goals = totalOf('goal');
    const assists = totalOf('assist');
    const dribbles = totalOf('dribble');
    const tackles = totalOf('tackle');
    const saves = totalOf('save');
    const passes = totalOf('pass_accuracy');
    const matches = totalOf('match');

    return {
      PAC: clamp(55 + dribbles * 2 + matches),
      SHO: clamp(50 + goals * 4),
      PAS: clamp(50 + assists * 4 + passes * 2),
      DRI: clamp(52 + dribbles * 3),
      DEF: clamp(48 + tackles * 3 + saves * 2),
      PHY: clamp(55 + matches * 2),
    };
  }

  /** The single big number on the FIFA card. */
  async fifaOverall(playerId: number): Promise<number> {
    const attributes = await this.fifaAttributes(playerId);
    const values = Object.values(attributes);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }
}
