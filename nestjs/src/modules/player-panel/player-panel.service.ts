import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Model reads for the player self-service panel. SQL copied verbatim from
 * app/Models/{Payment,Attendance,Alert,Achievement,CaseNote,HomeworkVideo}.php.
 */
@Injectable()
export class PlayerPanelService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async findPlayer(playerId: number): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_players WHERE id = ? AND deleted_at IS NULL',
      [playerId],
    );
    return rows[0] ?? null;
  }

  /** Payment::getByPlayerId() */
  async getPaymentsByPlayerId(playerId: number): Promise<any[]> {
    return this.db.query(
      `SELECT * FROM fc_payments
       WHERE player_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [playerId],
    );
  }

  /** Payment::getTotalPaidByPlayer() */
  async getTotalPaidByPlayer(playerId: number): Promise<number> {
    const rows = await this.db.query(
      `SELECT SUM(amount) as total FROM fc_payments
       WHERE player_id = ? AND status = 'completed' AND deleted_at IS NULL`,
      [playerId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  /** Payment::getTotalOutstandingByPlayer() */
  async getTotalOutstandingByPlayer(playerId: number): Promise<number> {
    const rows = await this.db.query(
      `SELECT SUM(amount) as total FROM fc_payments
       WHERE player_id = ? AND status IN ('pending', 'failed') AND deleted_at IS NULL`,
      [playerId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  /** Attendance::getByPlayerId() */
  async getAttendanceByPlayerId(playerId: number): Promise<any[]> {
    return this.db.query(
      'SELECT * FROM fc_attendance WHERE player_id = ? ORDER BY session_date DESC',
      [playerId],
    );
  }

  /** Attendance::getAttendancePercentage() */
  async getAttendancePercentage(playerId: number): Promise<number> {
    const rows = await this.db.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as present
       FROM fc_attendance WHERE player_id = ?`,
      [playerId],
    );
    const total = Number(rows[0]?.total ?? 0);
    if (total === 0) {
      return 0;
    }
    return (Number(rows[0].present) / total) * 100;
  }

  /** Achievement::getByPlayerId($id, true) */
  async getAchievementsByPlayerId(playerId: number): Promise<any[]> {
    return this.db.query(
      `SELECT a.*, u.name as created_by_name
       FROM fc_achievements a
       LEFT JOIN fc_users u ON a.created_by = u.id
       WHERE a.player_id = ? AND is_published = 1 AND a.deleted_at IS NULL
       ORDER BY a.date_achieved DESC, a.created_at DESC`,
      [playerId],
    );
  }

  /** Achievement::getPlayerStats() */
  async getAchievementStats(playerId: number): Promise<any> {
    const byType = await this.db.query(
      `SELECT achievement_type, COUNT(*) as count, SUM(points) as total_points
       FROM fc_achievements
       WHERE player_id = ? AND is_published = 1 AND deleted_at IS NULL
       GROUP BY achievement_type`,
      [playerId],
    );

    const totalRows = await this.db.query(
      `SELECT COUNT(*) as total, SUM(points) as total_points
       FROM fc_achievements
       WHERE player_id = ? AND is_published = 1 AND deleted_at IS NULL`,
      [playerId],
    );
    const total = totalRows[0] ?? {};

    return {
      by_type: byType,
      total: parseInt(total.total ?? 0, 10),
      total_points: parseInt(total.total_points ?? 0, 10),
    };
  }

  /** CaseNote::getByPlayerId($id, true) */
  async getVisibleCaseNotesByPlayerId(playerId: number): Promise<any[]> {
    return this.db.query(
      `SELECT cn.*, u.name as created_by_name
       FROM fc_case_notes cn
       LEFT JOIN fc_users u ON cn.created_by = u.id
       WHERE cn.player_id = ? AND is_visible_to_player = 1 AND cn.deleted_at IS NULL
       ORDER BY cn.created_at DESC`,
      [playerId],
    );
  }

  /** HomeworkVideo::getByPlayerId() */
  async getHomeworkByPlayerId(playerId: number): Promise<any[]> {
    return this.db.query(
      `SELECT * FROM fc_homework_videos
       WHERE player_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [playerId],
    );
  }
}
