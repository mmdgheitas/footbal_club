import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { TrainingSession } from '../../database/entities';
import { today } from '../../database/sql.helpers';

/**
 * جلسات تمرین — the training calendar behind the «تمرینات» tab of the player
 * app (past sessions and the dates of the next ones) and the coach planner.
 */
@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(TrainingSession)
    private readonly repo: Repository<TrainingSession>,
  ) {}

  upcoming(classroomId: number | null, limit = 10): Promise<TrainingSession[]> {
    return this.repo.find({
      where: {
        sessionDate: MoreThanOrEqual(today()),
        ...(classroomId !== null ? { classroomId } : {}),
      },
      relations: { classroom: true },
      order: { sessionDate: 'ASC' },
      take: limit,
    });
  }

  past(classroomId: number | null, limit = 20): Promise<TrainingSession[]> {
    return this.repo.find({
      where: {
        sessionDate: LessThan(today()),
        ...(classroomId !== null ? { classroomId } : {}),
      },
      relations: { classroom: true },
      order: { sessionDate: 'DESC' },
      take: limit,
    });
  }

  between(from: string, to: string, classroomId: number | null = null): Promise<TrainingSession[]> {
    return this.repo.find({
      where: {
        sessionDate: Between(from, to),
        ...(classroomId !== null ? { classroomId } : {}),
      },
      order: { sessionDate: 'ASC' },
    });
  }

  all(classroomIds: number[] | null = null): Promise<TrainingSession[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.classroom', 'c')
      .where('t.deletedAt IS NULL')
      .orderBy('t.sessionDate', 'DESC');
    if (classroomIds && classroomIds.length > 0) {
      qb.andWhere('t.classroomId IN (:...ids)', { ids: classroomIds });
    }
    return qb.getMany();
  }

  find(id: number): Promise<TrainingSession | null> {
    return this.repo.findOne({ where: { id }, relations: { classroom: true } });
  }

  create(data: {
    classroomId: number | null;
    title: string;
    sessionDate: string;
    startTime?: string | null;
    location?: string | null;
    notes?: string | null;
    createdBy: number | null;
  }): Promise<TrainingSession> {
    return this.repo.save(
      this.repo.create({
        classroomId: data.classroomId,
        title: data.title,
        sessionDate: data.sessionDate,
        startTime: data.startTime ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        createdBy: data.createdBy,
      }),
    );
  }

  async remove(id: number): Promise<void> {
    await this.repo.softDelete({ id });
  }
}
