import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  GuardianUser,
  Player,
  PlayerGuardian,
} from '../../database/entities';
import { normalizePhone } from '../../common/helpers/phone.helper';

/**
 * ولی‌ها — guardian accounts and their link to players.
 *
 * Cardinality enforced here and by the UNIQUE index on
 * fc_player_guardians.player_id: یک ولی می‌تواند چند بازیکن داشته باشد،
 * ولی هر بازیکن فقط یک ولی دارد.
 */
@Injectable()
export class GuardianService {
  constructor(
    @InjectRepository(GuardianUser)
    private readonly guardians: Repository<GuardianUser>,
    @InjectRepository(PlayerGuardian)
    private readonly links: Repository<PlayerGuardian>,
    @InjectRepository(Player)
    private readonly players: Repository<Player>,
  ) {}

  findByPhone(phone: string): Promise<GuardianUser | null> {
    return this.guardians.findOne({ where: { phone: normalizePhone(phone) } });
  }

  findById(id: number): Promise<GuardianUser | null> {
    return this.guardians.findOne({ where: { id } });
  }

  list(): Promise<GuardianUser[]> {
    return this.guardians.find({ order: { name: 'ASC' } });
  }

  async create(data: {
    name: string;
    phone: string;
    nationalId?: string | null;
    status?: number;
  }): Promise<GuardianUser> {
    const phone = normalizePhone(data.phone);
    const existing = await this.findByPhone(phone);
    if (existing) {
      return existing;
    }
    return this.guardians.save(
      this.guardians.create({
        uuid: uuidv4(),
        name: data.name,
        phone,
        nationalId: data.nationalId ?? null,
        status: data.status ?? 1,
      }),
    );
  }

  async update(
    id: number,
    data: { name?: string; phone?: string; nationalId?: string | null; status?: number },
  ): Promise<void> {
    const patch: Partial<GuardianUser> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.phone !== undefined) patch.phone = normalizePhone(data.phone);
    if (data.nationalId !== undefined) patch.nationalId = data.nationalId;
    if (data.status !== undefined) patch.status = data.status;
    await this.guardians.update({ id }, patch);
  }

  /** Attaches a player to a guardian, replacing any previous guardian. */
  async linkPlayer(
    guardianId: number,
    playerId: number,
    relationship: string | null = null,
  ): Promise<PlayerGuardian> {
    const existing = await this.links.findOne({ where: { playerId } });
    if (existing) {
      existing.guardianId = guardianId;
      existing.relationship = relationship ?? existing.relationship;
      return this.links.save(existing);
    }
    return this.links.save(
      this.links.create({ guardianId, playerId, relationship }),
    );
  }

  async unlinkPlayer(playerId: number): Promise<void> {
    await this.links.delete({ playerId });
  }

  /** All players belonging to this guardian, with their classroom name. */
  async playersOf(guardianId: number): Promise<Player[]> {
    const links = await this.links.find({ where: { guardianId } });
    const ids = links.map((l) => l.playerId);
    if (ids.length === 0) {
      return [];
    }
    return this.players
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.classroom', 'c')
      .where('p.id IN (:...ids)', { ids })
      .andWhere('p.deletedAt IS NULL')
      .orderBy('p.name', 'ASC')
      .getMany();
  }

  async playerIdsOf(guardianId: number): Promise<number[]> {
    const links = await this.links.find({ where: { guardianId } });
    return links.map((l) => l.playerId);
  }

  /** Guard used by every guardian-facing route before touching a player. */
  async owns(guardianId: number, playerId: number): Promise<boolean> {
    const link = await this.links.findOne({ where: { guardianId, playerId } });
    return link !== null;
  }

  /** The guardian account attached to a player (for notifications). */
  async guardianOfPlayer(playerId: number): Promise<GuardianUser | null> {
    const link = await this.links.findOne({ where: { playerId } });
    if (!link) {
      return null;
    }
    return this.findById(link.guardianId);
  }
}
