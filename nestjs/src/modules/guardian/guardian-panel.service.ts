import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ATTENDANCE_STATUS_LABELS } from '../../config/constants';

export interface AttendanceSummary {
  records: any[];
  present: number;
  absent: number;
  excused: number;
  late: number;
  total: number;
  percentage: number;
}

/**
 * Read models for the guardian panel. Kept as plain SQL so a guardian screen
 * never triggers a per-child cascade of ORM queries.
 */
@Injectable()
export class GuardianPanelService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async playerDetail(playerId: number): Promise<any | null> {
    const rows = await this.db.query(
      `SELECT p.*, c.name AS classroom_name
       FROM fc_players p
       LEFT JOIN fc_classrooms c ON c.id = p.classroom_id
       WHERE p.id = ? AND p.deleted_at IS NULL`,
      [playerId],
    );
    return rows?.[0] ?? null;
  }

  async attendanceOf(playerId: number, limit = 40): Promise<AttendanceSummary> {
    const records = await this.db.query(
      `SELECT session_date, status, recorded_at
       FROM fc_attendance
       WHERE player_id = ?
       ORDER BY session_date DESC
       LIMIT ${limit}`,
      [playerId],
    );

    const counts = await this.db.query(
      `SELECT status, COUNT(*) AS count FROM fc_attendance
       WHERE player_id = ? GROUP BY status`,
      [playerId],
    );

    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let total = 0;
    for (const row of counts ?? []) {
      const status = Number(row.status);
      const count = Number(row.count ?? 0);
      map[status] = count;
      total += count;
    }

    return {
      records: (records ?? []).map((r: any) => ({
        ...r,
        status_label: ATTENDANCE_STATUS_LABELS[Number(r.status)] ?? '—',
      })),
      present: map[1],
      absent: map[2],
      excused: map[3],
      late: map[4],
      total,
      percentage: total === 0 ? 0 : Math.round((map[1] / total) * 100),
    };
  }

  /** Compact per-child summary for the guardian dashboard cards. */
  async childSummaries(playerIds: number[]): Promise<Record<number, any>> {
    const summaries: Record<number, any> = {};
    for (const id of playerIds) {
      const attendance = await this.attendanceOf(id, 1);
      const scoreRow = await this.db.query(
        'SELECT COALESCE(SUM(points), 0) AS total FROM fc_player_scores WHERE player_id = ?',
        [id],
      );
      const badgeRow = await this.db.query(
        'SELECT COUNT(*) AS count FROM fc_player_badges WHERE player_id = ?',
        [id],
      );
      const debtRow = await this.db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM fc_payments
         WHERE player_id = ? AND status IN ('pending','failed') AND deleted_at IS NULL`,
        [id],
      );

      summaries[id] = {
        attendance_percentage: attendance.percentage,
        total_score: Number(scoreRow?.[0]?.total ?? 0),
        badges: Number(badgeRow?.[0]?.count ?? 0),
        debt: Number(debtRow?.[0]?.total ?? 0),
      };
    }
    return summaries;
  }
}
