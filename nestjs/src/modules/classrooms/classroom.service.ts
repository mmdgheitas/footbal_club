import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Port of app/Models/Classroom.php and the Model base methods the classroom
 * screens use. SQL copied verbatim.
 *
 * Note: Classroom::find() is Model::find() and has NO deleted_at filter,
 * unlike Player::find(). Preserved.
 */
@Injectable()
export class ClassroomService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Classroom::all() -> Model::all(): no ORDER BY, no deleted_at filter. */
  async all(): Promise<any[]> {
    return this.db.query('SELECT * FROM fc_classrooms');
  }

  /** Model::find() */
  async find(id: number): Promise<any | null> {
    const rows = await this.db.query('SELECT * FROM fc_classrooms WHERE id = ?', [id]);
    return rows[0] ?? null;
  }

  /** Model::findBy('name', value) */
  async findByName(name: string): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_classrooms WHERE name = ?',
      [name],
    );
    return rows[0] ?? null;
  }

  /**
   * Model::count("classroom_id = N AND deleted_at IS NULL").
   * The where clause is built from an int-cast id, so it is safe to inline
   * exactly as the legacy code does.
   */
  async countPlayers(classroomId: number): Promise<number> {
    const rows = await this.db.query(
      `SELECT COUNT(*) as count FROM fc_players
       WHERE classroom_id = ${classroomId} AND deleted_at IS NULL`,
    );
    return parseInt(rows[0]?.count ?? 0, 10);
  }

  /** Classroom::getRoster() */
  async getRoster(classroomId: number): Promise<any[]> {
    return this.db.query(
      `SELECT * FROM fc_players
       WHERE classroom_id = ? AND status = 1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [classroomId],
    );
  }

  /** Classroom::getAvailablePlayersForClassroom() */
  async getAvailablePlayersForClassroom(excludeClassroomId: number): Promise<any[]> {
    return this.db.query(
      `SELECT * FROM fc_players
       WHERE (classroom_id IS NULL OR classroom_id != ?)
         AND status = 1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [excludeClassroomId],
    );
  }

  /** Classroom::createClassroom() */
  async createClassroom(data: Record<string, any>): Promise<number | false> {
    const row = { uuid: data.uuid ?? uuidv4(), ...data };
    const cols = Object.keys(row);
    const result: any = await this.db.query(
      `INSERT INTO fc_classrooms (${cols.join(', ')})
       VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
    return result?.insertId ?? false;
  }

  /** Model::update() */
  async updateClassroom(id: number, data: Record<string, any>): Promise<boolean> {
    const cols = Object.keys(data);
    if (cols.length === 0) {
      return false;
    }
    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    const affected = await this.db.query(
      `UPDATE fc_classrooms SET ${setClause} WHERE id = ?`,
      [...cols.map((c) => data[c]), id],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** Model::delete() - hard delete. */
  async deleteClassroom(id: number): Promise<boolean> {
    const affected = await this.db.query('DELETE FROM fc_classrooms WHERE id = ?', [id]);
    return (affected?.affectedRows ?? 0) > 0;
  }

  async findPlayer(playerId: number): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_players WHERE id = ? AND deleted_at IS NULL',
      [playerId],
    );
    return rows[0] ?? null;
  }

  /** Model::update() on fc_players. */
  async updatePlayer(playerId: number, data: Record<string, any>): Promise<boolean> {
    const cols = Object.keys(data);
    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    const affected = await this.db.query(
      `UPDATE fc_players SET ${setClause} WHERE id = ?`,
      [...cols.map((c) => data[c]), playerId],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }
}
