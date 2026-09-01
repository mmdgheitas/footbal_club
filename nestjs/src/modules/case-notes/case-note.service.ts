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
 * Port of app/Models/CaseNote.php. SQL copied verbatim.
 */
@Injectable()
export class CaseNoteService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** CaseNote::getByPlayerId($id, $onlyVisible) */
  async getByPlayerId(playerId: number, onlyVisible = false): Promise<any[]> {
    const visibleCondition = onlyVisible ? 'AND is_visible_to_player = 1' : '';
    return this.db.query(
      `SELECT cn.*, u.name as created_by_name
       FROM fc_case_notes cn
       LEFT JOIN fc_users u ON cn.created_by = u.id
       WHERE cn.player_id = ? ${visibleCondition} AND cn.deleted_at IS NULL
       ORDER BY cn.created_at DESC`,
      [playerId],
    );
  }

  /** CaseNote::getHighSeverityNotes() */
  async getHighSeverityNotes(): Promise<any[]> {
    return this.db.query(
      `SELECT cn.*, p.name as player_name, u.name as created_by_name
       FROM fc_case_notes cn
       LEFT JOIN fc_players p ON cn.player_id = p.id
       LEFT JOIN fc_users u ON cn.created_by = u.id
       WHERE cn.severity = 'high' AND cn.deleted_at IS NULL
       ORDER BY cn.created_at DESC
       LIMIT 20`,
    );
  }

  /** CaseNote::getCaseNote() */
  async getCaseNote(id: number): Promise<any | null> {
    const rows = await this.db.query(
      `SELECT cn.*, p.name as player_name, u.name as created_by_name
       FROM fc_case_notes cn
       LEFT JOIN fc_players p ON cn.player_id = p.id
       LEFT JOIN fc_users u ON cn.created_by = u.id
       WHERE cn.id = ? AND cn.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** CaseNote::createCaseNote() */
  async createCaseNote(data: Record<string, any>): Promise<number | false> {
    const row = { uuid: data.uuid ?? uuidv4(), ...data };
    const cols = Object.keys(row);
    const result: any = await this.db.query(
      `INSERT INTO fc_case_notes (${cols.join(', ')})
       VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
    return result?.insertId ?? false;
  }

  /** Model::update() on fc_case_notes. */
  async updateCaseNote(id: number, data: Record<string, any>): Promise<boolean> {
    const cols = Object.keys(data);
    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    const affected = await this.db.query(
      `UPDATE fc_case_notes SET ${setClause} WHERE id = ?`,
      [...cols.map((c) => data[c]), id],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** CaseNote::updateVisibility() */
  async updateVisibility(id: number, visible: boolean): Promise<boolean> {
    const affected = await this.db.query(
      'UPDATE fc_case_notes SET is_visible_to_player = ? WHERE id = ?',
      [visible ? 1 : 0, id],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** CaseNote::deleteCaseNote() - soft delete. */
  async deleteCaseNote(id: number): Promise<boolean> {
    const affected = await this.db.query(
      'UPDATE fc_case_notes SET deleted_at = ? WHERE id = ?',
      [nowDatetime(), id],
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
