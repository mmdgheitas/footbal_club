import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Port of the Attendance/Player/Classroom reads used by the attendance screens.
 * SQL is copied verbatim from app/Models/Attendance.php and Player.php.
 */
@Injectable()
export class AttendanceService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Attendance::getBySessionDate() */
  async getBySessionDate(date: string): Promise<any[]> {
    return this.db.query(
      'SELECT * FROM fc_attendance WHERE session_date = ? ORDER BY player_id ASC',
      [date],
    );
  }

  /** Attendance::getByPlayerId() */
  async getByPlayerId(playerId: number): Promise<any[]> {
    return this.db.query(
      'SELECT * FROM fc_attendance WHERE player_id = ? ORDER BY session_date DESC',
      [playerId],
    );
  }

  /** Attendance::getByPlayerAndDate() */
  async getByPlayerAndDate(playerId: number, date: string): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_attendance WHERE player_id = ? AND session_date = ?',
      [playerId, date],
    );
    return rows[0] ?? null;
  }

  /** Attendance::markAttendance() - update when a row exists, else insert. */
  async markAttendance(
    playerId: number,
    date: string,
    status: number,
    userId: number,
  ): Promise<number | boolean> {
    const existing = await this.getByPlayerAndDate(playerId, date);

    if (existing) {
      const affected = await this.db.query(
        'UPDATE fc_attendance SET status = ?, recorded_by = ? WHERE id = ?',
        [status, userId, existing.id],
      );
      return (affected?.affectedRows ?? 0) > 0;
    }

    const result = await this.db.query(
      `INSERT INTO fc_attendance (uuid, player_id, session_date, status, recorded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), playerId, date, status, userId],
    );
    return result?.insertId ?? false;
  }

  /** Attendance::getAttendancePercentage() */
  async getAttendancePercentage(playerId: number): Promise<number> {
    const rows = await this.db.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as present
       FROM fc_attendance WHERE player_id = ?`,
      [playerId],
    );
    const result = rows[0];
    // mysql2 returns COUNT/SUM as strings; PHP compared loosely with == 0.
    const total = Number(result?.total ?? 0);
    if (total === 0) {
      return 0;
    }
    return (Number(result.present) / total) * 100;
  }

  /** Player::getByClassroom() */
  async getPlayersByClassroom(classroomId: number): Promise<any[]> {
    return this.db.query(
      `SELECT * FROM fc_players
       WHERE classroom_id = ? AND status = 1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [classroomId],
    );
  }

  async findPlayer(playerId: number): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_players WHERE id = ? AND deleted_at IS NULL',
      [playerId],
    );
    return rows[0] ?? null;
  }

  /** Classroom::all() -> Model::all(), no ORDER BY and no deleted_at filter. */
  async getAllClassrooms(): Promise<any[]> {
    return this.db.query('SELECT * FROM fc_classrooms');
  }
}
