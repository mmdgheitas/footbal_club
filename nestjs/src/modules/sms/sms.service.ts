import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  SMS_API_KEY,
  SMS_API_SECRET,
  SMS_FROM_NUMBER,
  SMS_PROVIDER,
  ITEMS_PER_PAGE,
} from '../../config/constants';
import {
  MockSmsProvider,
  NexmoSmsProvider,
  SmsProvider,
  TwilioSmsProvider,
} from '../../common/sms/sms-provider';

/**
 * Port of the SMS-related model methods and the provider initialisation in
 * SmsController::__construct().
 */
@Injectable()
export class SmsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /**
   * SmsController::initializeSmsProvider() - the provider named in the
   * settings table wins over the config default; 'log' maps to 'mock';
   * anything unrecognised falls back to the mock provider.
   */
  async getProvider(): Promise<SmsProvider> {
    let provider = SMS_PROVIDER;
    try {
      const rows = await this.db.query(
        'SELECT setting_value FROM fc_settings WHERE setting_key = ?',
        ['sms_provider'],
      );
      const stored = rows[0]?.setting_value ?? null;
      if (stored !== null && stored !== '') {
        provider = String(stored);
      }
    } catch {
      // Fall back to config when settings table is unavailable
    }

    if (provider === 'log') {
      provider = 'mock';
    }

    if (provider === 'twilio') {
      return new TwilioSmsProvider(SMS_API_KEY, SMS_API_SECRET, SMS_FROM_NUMBER);
    } else if (provider === 'nexmo') {
      return new NexmoSmsProvider(SMS_API_KEY, SMS_API_SECRET, SMS_FROM_NUMBER);
    }
    // Use mock provider in development
    return new MockSmsProvider(SMS_API_KEY, SMS_API_SECRET, SMS_FROM_NUMBER);
  }

  async findPlayer(playerId: number): Promise<any | null> {
    const rows = await this.db.query(
      'SELECT * FROM fc_players WHERE id = ? AND deleted_at IS NULL',
      [playerId],
    );
    return rows[0] ?? null;
  }

  /** Player::getActive() */
  async getActivePlayers(): Promise<any[]> {
    return this.db.query(
      'SELECT * FROM fc_players WHERE status = 1 AND deleted_at IS NULL ORDER BY name ASC',
    );
  }

  /** Guardian::getByPlayerId() */
  async getGuardiansByPlayerId(playerId: number): Promise<any[]> {
    return this.db.query(
      'SELECT * FROM fc_guardians WHERE player_id = ? AND deleted_at IS NULL',
      [playerId],
    );
  }

  /** SmsLog::logSms() */
  async logSms(data: Record<string, any>): Promise<number | false> {
    const row = { uuid: data.uuid ?? uuidv4(), ...data };
    const cols = Object.keys(row);
    const result: any = await this.db.query(
      `INSERT INTO fc_sms_logs (${cols.join(', ')})
       VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
    return result?.insertId ?? false;
  }

  /** SmsController::logs() filtered, paginated query. */
  async listLogs(page: number, filter: string): Promise<any[]> {
    let query = 'SELECT * FROM fc_sms_logs WHERE 1=1';
    const params: any[] = [];

    if (filter === 'pending') {
      query += " AND status = 'pending'";
    } else if (filter === 'failed') {
      query += " AND status = 'failed'";
    } else if (filter === 'sent') {
      query += " AND status IN ('sent', 'delivered')";
    }

    query += ' ORDER BY created_at DESC LIMIT ?, ?';

    const offset = (page - 1) * ITEMS_PER_PAGE;
    params.push(offset);
    params.push(ITEMS_PER_PAGE);

    return this.db.query(query, params);
  }
}
