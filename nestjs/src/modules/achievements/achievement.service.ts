import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/** PHP date('Y-m-d') / date('Y-m-d H:i:s') in local time. */
function phpDate(withTime = false): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  if (!withTime) return date;
  return `${date} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Port of app/Models/Achievement.php. SQL copied verbatim.
 */
@Injectable()
export class AchievementService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Achievement::getByPlayerId($id, $onlyPublished) */
  async getByPlayerId(playerId: number, onlyPublished = true): Promise<any[]> {
    const publishedCondition = onlyPublished ? 'AND is_published = 1' : '';
    return this.db.query(
      `SELECT a.*, u.name as created_by_name
       FROM fc_achievements a
       LEFT JOIN fc_users u ON a.created_by = u.id
       WHERE a.player_id = ? ${publishedCondition} AND a.deleted_at IS NULL
       ORDER BY a.date_achieved DESC, a.created_at DESC`,
      [playerId],
    );
  }

  /** Achievement::getPlayerStats() */
  async getPlayerStats(playerId: number): Promise<any> {
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

  /** Achievement::getRecent(50) */
  async getRecent(limit = 10): Promise<any[]> {
    return this.db.query(
      `SELECT a.*, p.name as player_name, u.name as created_by_name
       FROM fc_achievements a
       LEFT JOIN fc_players p ON a.player_id = p.id
       LEFT JOIN fc_users u ON a.created_by = u.id
       WHERE a.is_published = 1 AND a.deleted_at IS NULL
       ORDER BY a.date_achieved DESC, a.created_at DESC
       LIMIT ?`,
      [limit],
    );
  }

  /** Achievement::getAchievement() */
  async getAchievement(id: number): Promise<any | null> {
    const rows = await this.db.query(
      `SELECT a.*, p.name as player_name, u.name as created_by_name
       FROM fc_achievements a
       LEFT JOIN fc_players p ON a.player_id = p.id
       LEFT JOIN fc_users u ON a.created_by = u.id
       WHERE a.id = ? AND a.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** Achievement::createAchievement() */
  async createAchievement(data: Record<string, any>): Promise<number | false> {
    const row = {
      uuid: data.uuid ?? uuidv4(),
      ...data,
      date_achieved: data.date_achieved ?? phpDate(),
    };
    const cols = Object.keys(row);
    const result: any = await this.db.query(
      `INSERT INTO fc_achievements (${cols.join(', ')})
       VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
    return result?.insertId ?? false;
  }

  /** Model::update() on fc_achievements. */
  async updateAchievement(id: number, data: Record<string, any>): Promise<boolean> {
    const cols = Object.keys(data);
    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    const affected = await this.db.query(
      `UPDATE fc_achievements SET ${setClause} WHERE id = ?`,
      [...cols.map((c) => data[c]), id],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** Achievement::deleteAchievement() - soft delete. */
  async deleteAchievement(id: number): Promise<boolean> {
    const affected = await this.db.query(
      'UPDATE fc_achievements SET deleted_at = ? WHERE id = ?',
      [phpDate(true), id],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** Achievement::togglePublish() */
  async togglePublish(id: number, publish = true): Promise<boolean> {
    const affected = await this.db.query(
      'UPDATE fc_achievements SET is_published = ? WHERE id = ?',
      [publish ? 1 : 0, id],
    );
    return (affected?.affectedRows ?? 0) > 0;
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

  /** User::findBy('player_id', $playerId) */
  async findUserByPlayerId(playerId: number): Promise<any | null> {
    const rows = await this.db.query('SELECT * FROM fc_users WHERE player_id = ?', [
      playerId,
    ]);
    return rows[0] ?? null;
  }
}
