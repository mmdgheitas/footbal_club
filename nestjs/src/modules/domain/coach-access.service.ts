import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Classroom,
  Player,
  RegistrationStatus,
} from '../../database/entities';

/**
 * محدودیت دسترسی مربی.
 *
 * A coach may only ever see **approved players of their own classrooms**. Every
 * coach-facing route funnels through this service; nothing else grants access
 * to a player id, so there is a single place to audit.
 */
@Injectable()
export class CoachAccessService {
  constructor(
    @InjectRepository(Classroom) private readonly classrooms: Repository<Classroom>,
    @InjectRepository(Player) private readonly players: Repository<Player>,
  ) {}

  /** Classrooms this coach is responsible for. */
  classroomsOf(coachUserId: number): Promise<Classroom[]> {
    return this.classrooms.find({
      where: { coachId: coachUserId },
      order: { name: 'ASC' },
    });
  }

  async classroomIdsOf(coachUserId: number): Promise<number[]> {
    const rows = await this.classroomsOf(coachUserId);
    return rows.map((c) => c.id);
  }

  /**
   * Approved players of the coach's classrooms.
   * `classroomId` optionally narrows it down, but only to an own classroom.
   */
  async playersOf(
    coachUserId: number,
    classroomId: number | null = null,
  ): Promise<Player[]> {
    const ids = await this.classroomIdsOf(coachUserId);
    if (ids.length === 0) {
      return [];
    }
    const scoped = classroomId !== null && ids.includes(classroomId) ? [classroomId] : ids;

    return this.players.find({
      where: {
        classroomId: In(scoped),
        registrationStatus: RegistrationStatus.APPROVED,
        status: 1,
      },
      relations: { classroom: true },
      order: { name: 'ASC' },
    });
  }

  /** True only when the player is an approved member of the coach's classroom. */
  async canAccessPlayer(coachUserId: number, playerId: number): Promise<boolean> {
    const ids = await this.classroomIdsOf(coachUserId);
    if (ids.length === 0) {
      return false;
    }
    const player = await this.players.findOne({
      where: {
        id: playerId,
        classroomId: In(ids),
        registrationStatus: RegistrationStatus.APPROVED,
      },
    });
    return player !== null;
  }

  /**
   * Resolves a player for a coach request, or null when it is out of scope.
   * super_admin bypasses the classroom restriction (full access by definition).
   */
  async resolvePlayer(
    role: string | null,
    userId: number | null,
    playerId: number,
  ): Promise<Player | null> {
    if (role === 'super_admin') {
      return this.players.findOne({
        where: { id: playerId },
        relations: { classroom: true },
      });
    }
    if (role !== 'coach' || !userId) {
      return null;
    }
    if (!(await this.canAccessPlayer(userId, playerId))) {
      return null;
    }
    return this.players.findOne({
      where: { id: playerId },
      relations: { classroom: true },
    });
  }
}
