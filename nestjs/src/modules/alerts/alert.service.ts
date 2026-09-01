import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AGE_CATEGORIES } from '../../config/constants';

/** PHP date('Y-m-d H:i:s') in the server's local timezone. */
function nowDatetime(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Port of app/Models/Alert.php plus the classroom/player reads the alert
 * screens need. SQL copied verbatim.
 */
@Injectable()
export class AlertService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Alert::getActiveAlerts() */
  async getActiveAlerts(): Promise<any[]> {
    return this.db.query(
      `SELECT a.*, u.name as author_name FROM fc_alerts a
       LEFT JOIN fc_users u ON a.created_by = u.id
       WHERE a.deleted_at IS NULL
       ORDER BY a.created_at DESC`,
    );
  }

  /**
   * Alert::getAlertsForPlayer().
   *
   * Note the legacy controller only passes ageCategory, leaving playerId and
   * classroomId null, so the 'class' and 'player' branches can never match.
   * That is preserved rather than corrected.
   */
  async getAlertsForPlayer(
    ageCategory: string,
    playerId: number | null = null,
    classroomId: number | null = null,
  ): Promise<any[]> {
    const ageRange: any = AGE_CATEGORIES[ageCategory] ?? { min: 0, max: 100 };
    const minAge = ageRange.min;
    const maxAge = ageRange.max;

    const query = `SELECT a.*, u.name as author_name FROM fc_alerts a
                   LEFT JOIN fc_users u ON a.created_by = u.id
                   WHERE a.deleted_at IS NULL AND (
                       a.target_type = 'all'
                       OR (a.target_type = 'age_range' AND a.target_age_min <= ? AND a.target_age_max >= ?)
                       OR (a.target_type = 'class' AND a.target_id = ?)
                       OR (a.target_type = 'player' AND a.target_id = ?)
                       OR (a.target_type IS NULL AND a.target_audience = 'all')
                       OR (a.target_audience = ?)
                   )
                   AND (a.expires_at IS NULL OR a.expires_at > ?)
                   ORDER BY
                       CASE a.priority
                           WHEN 'urgent' THEN 1
                           WHEN 'high' THEN 2
                           WHEN 'medium' THEN 3
                           WHEN 'low' THEN 4
                           ELSE 5
                       END,
                       a.created_at DESC`;

    return this.db.query(query, [
      minAge,
      maxAge,
      classroomId,
      playerId,
      ageCategory,
      nowDatetime(),
    ]);
  }

  /** Alert::createAlert() */
  async createAlert(data: Record<string, any>): Promise<number | false> {
    const row = { uuid: data.uuid ?? uuidv4(), ...data };
    const cols = Object.keys(row);
    const result: any = await this.db.query(
      `INSERT INTO fc_alerts (${cols.join(', ')})
       VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
    return result?.insertId ?? false;
  }

  /** Alert::softDelete() */
  async softDelete(id: number): Promise<boolean> {
    const affected = await this.db.query(
      'UPDATE fc_alerts SET deleted_at = ? WHERE id = ?',
      [nowDatetime(), id],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  async getAllClassrooms(): Promise<any[]> {
    return this.db.query('SELECT * FROM fc_classrooms');
  }

  async getActivePlayers(): Promise<any[]> {
    return this.db.query(
      'SELECT * FROM fc_players WHERE status = 1 AND deleted_at IS NULL ORDER BY name ASC',
    );
  }

  async findPlayer(playerId: number): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_players WHERE id = ? AND deleted_at IS NULL',
      [playerId],
    );
    return rows[0] ?? null;
  }
}
