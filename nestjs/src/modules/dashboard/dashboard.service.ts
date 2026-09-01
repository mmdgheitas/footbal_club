import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ATTENDANCE_WARNING_THRESHOLD } from '../../config/constants';

export interface CategoryRow {
  age_category: string;
  count: number;
}
export interface PositionRow {
  position: string;
  count: number;
}
export interface MonthlyRow {
  month: number;
  total: string;
}
export interface DebtRow {
  id: number;
  uuid: string;
  name: string;
  email: string | null;
  pending_count: number;
  total_outstanding: string;
}

/**
 * Dashboard aggregates.
 *
 * The SQL below is copied verbatim from app/Models/Player.php::getStatistics(),
 * app/Models/Payment.php::{getMonthlyRevenue,getYearlyRevenue,getDebtsReport}()
 * and app/Models/Attendance.php::getPlayersWithLowAttendance(), so the numbers
 * shown are identical to the legacy application.
 */
@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Player::getStatistics() */
  async getStatistics(): Promise<{
    total: number;
    by_category: CategoryRow[];
    by_position: PositionRow[];
  }> {
    const totalRow = await this.db.query(
      'SELECT COUNT(*) as count FROM fc_players WHERE status = 1 AND deleted_at IS NULL',
    );
    const by_category: CategoryRow[] = await this.db.query(
      'SELECT age_category, COUNT(*) as count FROM fc_players WHERE status = 1 GROUP BY age_category',
    );
    const by_position: PositionRow[] = await this.db.query(
      'SELECT position, COUNT(*) as count FROM fc_players WHERE status = 1 GROUP BY position',
    );

    return {
      total: Number(totalRow?.[0]?.count ?? 0),
      by_category,
      by_position,
    };
  }

  /** Payment::getMonthlyRevenue() */
  async getMonthlyRevenue(month: number, year: number): Promise<number> {
    const rows = await this.db.query(
      `SELECT SUM(amount) as total FROM fc_payments
       WHERE YEAR(created_at) = ? AND MONTH(created_at) = ? AND status = 'completed' AND deleted_at IS NULL`,
      [year, month],
    );
    return Number(rows?.[0]?.total ?? 0);
  }

  /** Payment::getYearlyRevenue() */
  async getYearlyRevenue(year: number): Promise<MonthlyRow[]> {
    return this.db.query(
      `SELECT MONTH(created_at) as month, SUM(amount) as total FROM fc_payments
       WHERE YEAR(created_at) = ? AND status = 'completed' AND deleted_at IS NULL
       GROUP BY MONTH(created_at) ORDER BY month ASC`,
      [year],
    );
  }

  /** Payment::getDebtsReport() */
  async getDebtsReport(): Promise<DebtRow[]> {
    return this.db.query(
      `SELECT
         p.id,
         p.uuid,
         p.name,
         p.email,
         COUNT(pm.id) as pending_count,
         SUM(CASE WHEN pm.status IN ('pending', 'failed') THEN pm.amount ELSE 0 END) as total_outstanding
       FROM fc_players p
       LEFT JOIN fc_payments pm ON p.id = pm.player_id AND pm.status IN ('pending', 'failed') AND pm.deleted_at IS NULL
       WHERE p.status = 1 AND p.deleted_at IS NULL
       GROUP BY p.id, p.uuid, p.name, p.email
       HAVING total_outstanding > 0
       ORDER BY total_outstanding DESC`,
    );
  }

  /** Attendance::getPlayersWithLowAttendance() */
  async getPlayersWithLowAttendance(
    threshold: number = ATTENDANCE_WARNING_THRESHOLD,
  ): Promise<unknown[]> {
    return this.db.query(
      `SELECT
         p.id,
         p.uuid,
         p.name,
         p.email,
         COUNT(a.id) as total_sessions,
         SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END) as present_sessions,
         ROUND((SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 2) as attendance_percentage
       FROM fc_players p
       LEFT JOIN fc_attendance a ON p.id = a.player_id
       WHERE p.status = 1 AND p.deleted_at IS NULL
       GROUP BY p.id, p.uuid, p.name, p.email
       HAVING attendance_percentage < ?
       ORDER BY attendance_percentage ASC`,
      [threshold],
    );
  }
}
