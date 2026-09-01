import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ITEMS_PER_PAGE } from '../../config/constants';

/**
 * Port of app/Models/Setting.php and the user listing query in AdminController.
 */
@Injectable()
export class AdminService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Setting::getAllKeyed() */
  async getAllKeyed(): Promise<Record<string, string>> {
    const rows = await this.db.query(
      'SELECT setting_key, setting_value FROM fc_settings',
    );
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.setting_key] = String(row.setting_value ?? '');
    }
    return settings;
  }

  /** Setting::setMany() - one upsert per key. */
  async setMany(settings: Record<string, string>): Promise<boolean> {
    const query = `INSERT INTO fc_settings (setting_key, setting_value)
                   VALUES (?, ?)
                   ON DUPLICATE KEY UPDATE setting_value = ?`;
    for (const [key, value] of Object.entries(settings)) {
      await this.db.query(query, [key, String(value), String(value)]);
    }
    return true;
  }

  /** AdminController::users() inline paginated query. */
  async listUsers(page: number, role: string): Promise<any[]> {
    let query = 'SELECT * FROM fc_users WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ?, ?';

    const offset = (page - 1) * ITEMS_PER_PAGE;
    params.push(offset);
    params.push(ITEMS_PER_PAGE);

    return this.db.query(query, params);
  }
}
