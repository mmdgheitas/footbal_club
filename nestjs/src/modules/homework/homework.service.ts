import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/** PHP date('Y-m-d H:i:s') in local time. */
function nowDatetime(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Port of app/Models/HomeworkVideo.php. SQL copied verbatim.
 */
@Injectable()
export class HomeworkService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** HomeworkVideo::getByPlayerId() */
  async getByPlayerId(playerId: number): Promise<any[]> {
    return this.db.query(
      `SELECT * FROM fc_homework_videos
       WHERE player_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [playerId],
    );
  }

  /** Classroom::findAllBy('coach_id', $coachId) */
  async getClassroomsByCoachId(coachId: number): Promise<any[]> {
    return this.db.query('SELECT * FROM fc_classrooms WHERE coach_id = ?', [coachId]);
  }

  /** HomeworkVideo::getByCoachId() - empty when the coach teaches nothing. */
  async getByCoachId(coachId: number): Promise<any[]> {
    const classrooms = await this.getClassroomsByCoachId(coachId);
    if (classrooms.length === 0) {
      return [];
    }

    const classroomIds = classrooms.map((c: any) => parseInt(c.id, 10));
    const placeholders = classroomIds.map(() => '?').join(',');

    return this.db.query(
      `SELECT hv.*, p.name as player_name, u.name as user_name, c.name as classroom_name
       FROM fc_homework_videos hv
       LEFT JOIN fc_players p ON hv.player_id = p.id
       LEFT JOIN fc_users u ON hv.user_id = u.id
       LEFT JOIN fc_classrooms c ON hv.classroom_id = c.id
       WHERE hv.classroom_id IN (${placeholders}) AND hv.deleted_at IS NULL
       ORDER BY hv.created_at DESC`,
      classroomIds,
    );
  }

  /** HomeworkVideo::getPending() */
  async getPending(): Promise<any[]> {
    return this.db.query(
      `SELECT hv.*, p.name as player_name, u.name as user_name, c.name as classroom_name
       FROM fc_homework_videos hv
       LEFT JOIN fc_players p ON hv.player_id = p.id
       LEFT JOIN fc_users u ON hv.user_id = u.id
       LEFT JOIN fc_classrooms c ON hv.classroom_id = c.id
       WHERE hv.status = 'submitted' AND hv.deleted_at IS NULL
       ORDER BY hv.created_at ASC`,
    );
  }

  /** HomeworkVideo::getVideo() */
  async getVideo(id: number): Promise<any | null> {
    const rows = await this.db.query(
      `SELECT hv.*, p.name as player_name, u.name as user_name, c.name as classroom_name
       FROM fc_homework_videos hv
       LEFT JOIN fc_players p ON hv.player_id = p.id
       LEFT JOIN fc_users u ON hv.user_id = u.id
       LEFT JOIN fc_classrooms c ON hv.classroom_id = c.id
       WHERE hv.id = ? AND hv.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  /**
   * HomeworkVideo::review() - a 1..5 rating marks it approved, anything else
   * leaves it merely reviewed.
   */
  async review(
    id: number,
    coachId: number,
    feedback: string,
    rating: number | null = null,
  ): Promise<boolean> {
    let status = 'reviewed';
    if (rating !== null && rating >= 1 && rating <= 5) {
      status = 'approved';
    }

    const affected = await this.db.query(
      `UPDATE fc_homework_videos
       SET status = ?, coach_feedback = ?, coach_rating = ?, reviewed_by = ?, reviewed_at = ?
       WHERE id = ?`,
      [status, feedback, rating, coachId, nowDatetime(), id],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** HomeworkVideo::createVideo() */
  async createVideo(data: Record<string, any>): Promise<number | false> {
    const row = { uuid: data.uuid ?? uuidv4(), ...data };
    const cols = Object.keys(row);
    const result: any = await this.db.query(
      `INSERT INTO fc_homework_videos (${cols.join(', ')})
       VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
    return result?.insertId ?? false;
  }

  async findPlayer(playerId: number): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_players WHERE id = ? AND deleted_at IS NULL',
      [playerId],
    );
    return rows[0] ?? null;
  }

  /** Classroom::find() - Model::find(), no deleted_at filter. */
  async findClassroom(classroomId: number): Promise<any | null> {
    const rows = await this.db.query('SELECT * FROM fc_classrooms WHERE id = ?', [
      classroomId,
    ]);
    return rows[0] ?? null;
  }
}
