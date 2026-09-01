import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ITEMS_PER_PAGE } from '../../config/constants';
import { PlayerHelper } from '../../common/helpers/player.helper';

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
  has_more: boolean;
}

/**
 * Player queries. SQL copied from app/Models/Player.php so pagination, search
 * and ordering behave identically to the legacy app.
 */
@Injectable()
export class PlayersService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Player::getPlayersList() */
  async getPlayersList(
    page = 1,
    search = '',
    classroomId: number | null = null,
    perPage: number = ITEMS_PER_PAGE,
  ): Promise<Paginated<any>> {
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * perPage;

    const params: unknown[] = [];
    const whereClauses = ['p.deleted_at IS NULL'];

    if (search) {
      whereClauses.push('(p.name LIKE ? OR p.national_id LIKE ? OR p.email LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (classroomId !== null && classroomId > 0) {
      whereClauses.push('p.classroom_id = ?');
      params.push(classroomId);
    }

    const whereStr = whereClauses.join(' AND ');

    const countResult = await this.db.query(
      `SELECT COUNT(*) as count FROM fc_players p WHERE ${whereStr}`,
      params,
    );
    const total = Number(countResult?.[0]?.count ?? 0);

    const data = await this.db.query(
      `SELECT p.*, c.name as classroom_name
       FROM fc_players p
       LEFT JOIN fc_classrooms c ON p.classroom_id = c.id
       WHERE ${whereStr}
       ORDER BY p.name ASC
       LIMIT ${perPage} OFFSET ${offset}`,
      params,
    );

    return {
      data,
      total,
      page: safePage,
      per_page: perPage,
      last_page: Math.ceil(total / perPage),
      has_more: offset + data.length < total,
    };
  }

  /** Player::getWithDetails() */
  async getWithDetails(id: number): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_players WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    const player = rows?.[0];
    if (!player) {
      return null;
    }

    if (player.classroom_id) {
      const c = await this.db.query('SELECT * FROM fc_classrooms WHERE id = ?', [
        Number(player.classroom_id),
      ]);
      player.classroom = c?.[0] ?? null;
    } else {
      player.classroom = null;
    }

    player.guardians = await this.db.query(
      'SELECT * FROM fc_guardians WHERE player_id = ? AND deleted_at IS NULL',
      [id],
    );
    // Medical::getByPlayerId() - no deleted_at filter in the legacy query.
    const med = await this.db.query(
      'SELECT * FROM fc_medical_records WHERE player_id = ?',
      [id],
    );
    player.medical = med?.[0] ?? null;
    // Injury::findAllBy('player_id', id) - no deleted_at filter, no ORDER BY.
    player.injuries = await this.db.query(
      'SELECT * FROM fc_injuries WHERE player_id = ?',
      [id],
    );
    // FileUpload::getByPlayerId()
    player.files = await this.db.query(
      `SELECT * FROM fc_file_uploads
       WHERE player_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [id],
    );

    return player;
  }

  async find(id: number): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_players WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return rows?.[0] ?? null;
  }

  /** Player::findByNationalId() — matches any row, including soft-deleted. */
  async findByNationalId(nationalId: string): Promise<any | null> {
    const rows = await this.db.query('SELECT * FROM fc_players WHERE national_id = ?', [
      nationalId,
    ]);
    return rows?.[0] ?? null;
  }

  /** Player::createPlayer() — assigns uuid and derives age_category. */
  async createPlayer(data: Record<string, unknown>): Promise<number> {
    const payload: Record<string, unknown> = { uuid: uuidv4(), ...data };
    if (payload.date_of_birth) {
      payload.age_category = PlayerHelper.getAgeCategory(String(payload.date_of_birth));
    }

    const cols = Object.keys(payload);
    const placeholders = cols.map(() => '?').join(', ');
    const result = await this.db.query(
      `INSERT INTO fc_players (${cols.join(', ')}) VALUES (${placeholders})`,
      cols.map((c) => payload[c]),
    );
    return Number(result?.insertId ?? 0);
  }

  async update(id: number, data: Record<string, unknown>): Promise<boolean> {
    if (data.date_of_birth) {
      data.age_category = PlayerHelper.getAgeCategory(String(data.date_of_birth));
    }
    const cols = Object.keys(data);
    if (cols.length === 0) {
      return true;
    }
    const assignments = cols.map((c) => `${c} = ?`).join(', ');
    await this.db.query(
      `UPDATE fc_players SET ${assignments} WHERE id = ?`,
      [...cols.map((c) => data[c]), id],
    );
    return true;
  }

  /** Soft delete — sets deleted_at, matching the legacy softDelete(). */
  async softDelete(id: number): Promise<boolean> {
    await this.db.query('UPDATE fc_players SET deleted_at = NOW() WHERE id = ?', [id]);
    return true;
  }

  /**
   * Medical-clearance evidence, combining the two sources the legacy update()
   * checks: fc_file_uploads rows of type medical_clearance, and
   * fc_document_submissions rows that are medical_clearance AND approved.
   */
  async findMedicalClearanceFiles(playerId: number): Promise<any[]> {
    const files = await this.db.query(
      `SELECT * FROM fc_file_uploads
       WHERE player_id = ? AND file_type = 'medical_clearance' AND deleted_at IS NULL`,
      [playerId],
    );
    const docs = await this.db.query(
      `SELECT * FROM fc_document_submissions
       WHERE player_id = ? AND document_type = 'medical_clearance'
         AND status = 'approved' AND deleted_at IS NULL`,
      [playerId],
    );
    return [...files, ...docs];
  }

  async listClassrooms(): Promise<any[]> {
    return this.db.query('SELECT * FROM fc_classrooms WHERE deleted_at IS NULL');
  }
}
