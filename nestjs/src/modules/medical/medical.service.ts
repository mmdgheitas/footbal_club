import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Port of app/Models/Medical.php and the Injury/Player reads the medical
 * screens need. SQL is copied verbatim so the records shown match.
 */
@Injectable()
export class MedicalService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Medical::getByPlayerId() */
  async getByPlayerId(playerId: number): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_medical_records WHERE player_id = ?',
      [playerId],
    );
    return rows[0] ?? null;
  }

  /** Medical::createOrUpdate() - update when a record exists, else insert. */
  async createOrUpdate(data: Record<string, any>): Promise<number | false> {
    const existing = await this.getByPlayerId(data.player_id);

    if (existing) {
      const cols = Object.keys(data).filter((k) => k !== 'player_id');
      const setClause = cols.map((c) => `${c} = ?`).join(', ');
      const ok =
        (await this.db.query(
          `UPDATE fc_medical_records SET ${setClause} WHERE id = ?`,
          [...cols.map((c) => data[c]), existing.id],
        )) !== undefined;
      return ok ? existing.id : false;
    }

    const withUuid = { uuid: data.uuid ?? uuidv4(), ...data };
    const cols = Object.keys(withUuid);
    const result = await this.db.query(
      `INSERT INTO fc_medical_records (${cols.join(', ')}) VALUES (${cols
        .map(() => '?')
        .join(', ')})`,
      cols.map((c) => withUuid[c]),
    );
    // mysql2 returns an OkPacket with insertId.
    return result?.insertId ?? false;
  }

  /** Injury::getByPlayerId() */
  async getInjuriesByPlayerId(playerId: number): Promise<any[]> {
    return this.db.query(
      'SELECT * FROM fc_injuries WHERE player_id = ? ORDER BY date_of_injury DESC',
      [playerId],
    );
  }

  /** Player::getActive() */
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
