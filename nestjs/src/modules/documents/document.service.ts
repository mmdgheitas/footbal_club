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

/** The three required types, repeated verbatim across the legacy model. */
const REQUIRED_TYPES = ['national_id', 'medical_clearance', 'birth_certificate'];

/**
 * Port of app/Models/DocumentSubmission.php plus the two User methods the
 * approve/reject flows call.
 *
 * Note: DocumentSubmission has no softDelete() and Model provides none, so
 * DocumentController::delete() would fatal. That action has no route in
 * App.php, so it is unreachable; it is deliberately not ported.
 */
@Injectable()
export class DocumentService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** DocumentSubmission::getRequiredDocumentsStatus() */
  async getRequiredDocumentsStatus(userId: number): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const type of REQUIRED_TYPES) {
      const rows = await this.db.query(
        `SELECT id, status, rejection_reason, original_filename, created_at
         FROM fc_document_submissions
         WHERE user_id = ? AND document_type = ? AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [userId, type],
      );
      const doc = rows[0] ?? null;

      status[type] = {
        submitted: doc !== null,
        status: doc?.status ?? 'not_submitted',
        rejection_reason: doc?.rejection_reason ?? null,
        filename: doc?.original_filename ?? null,
        submitted_at: doc?.created_at ?? null,
        id: doc?.id ?? null,
      };
    }

    return status;
  }

  /** DocumentSubmission::hasAllDocumentsSubmitted() */
  async hasAllDocumentsSubmitted(userId: number): Promise<boolean> {
    for (const type of REQUIRED_TYPES) {
      const rows = await this.db.query(
        `SELECT COUNT(*) as count FROM fc_document_submissions
         WHERE user_id = ? AND document_type = ? AND deleted_at IS NULL`,
        [userId, type],
      );
      if (parseInt(rows[0]?.count ?? 0, 10) === 0) {
        return false;
      }
    }
    return true;
  }

  /** DocumentSubmission::hasAllDocumentsApproved() */
  async hasAllDocumentsApproved(userId: number): Promise<boolean> {
    for (const type of REQUIRED_TYPES) {
      const rows = await this.db.query(
        `SELECT COUNT(*) as count FROM fc_document_submissions
         WHERE user_id = ? AND document_type = ? AND status = 'approved' AND deleted_at IS NULL`,
        [userId, type],
      );
      if (parseInt(rows[0]?.count ?? 0, 10) === 0) {
        return false;
      }
    }
    return true;
  }

  /** DocumentSubmission::getPending() */
  async getPending(): Promise<any[]> {
    return this.db.query(
      `SELECT ds.*, u.name as user_name, u.email as user_email, p.name as player_name
       FROM fc_document_submissions ds
       LEFT JOIN fc_users u ON ds.user_id = u.id
       LEFT JOIN fc_players p ON ds.player_id = p.id
       WHERE ds.status = 'pending' AND ds.deleted_at IS NULL
       ORDER BY ds.created_at ASC`,
    );
  }

  /** DocumentSubmission::getDocument() */
  async getDocument(id: number): Promise<any | null> {
    const rows = await this.db.query(
      `SELECT ds.*, u.name as user_name, u.email as user_email, p.name as player_name
       FROM fc_document_submissions ds
       LEFT JOIN fc_users u ON ds.user_id = u.id
       LEFT JOIN fc_players p ON ds.player_id = p.id
       WHERE ds.id = ? AND ds.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** DocumentSubmission::createSubmission() */
  async createSubmission(data: Record<string, any>): Promise<number | false> {
    const row = { uuid: data.uuid ?? uuidv4(), ...data };
    const cols = Object.keys(row);
    const result: any = await this.db.query(
      `INSERT INTO fc_document_submissions (${cols.join(', ')})
       VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
    return result?.insertId ?? false;
  }

  /** DocumentSubmission::approve() */
  async approve(id: number, reviewerId: number): Promise<boolean> {
    const affected = await this.db.query(
      `UPDATE fc_document_submissions
       SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
      [reviewerId, nowDatetime(), id],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** DocumentSubmission::reject() */
  async reject(id: number, reviewerId: number, reason: string): Promise<boolean> {
    const affected = await this.db.query(
      `UPDATE fc_document_submissions
       SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = ?
       WHERE id = ?`,
      [reason, reviewerId, nowDatetime(), id],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** User::approveDocuments() - also activates the account. */
  async approveUserDocuments(userId: number, adminId: number): Promise<boolean> {
    const affected = await this.db.query(
      `UPDATE fc_users
       SET document_status = 'approved', approved_by = ?, approved_at = ?, status = 1
       WHERE id = ?`,
      [adminId, nowDatetime(), userId],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** User::rejectDocuments() */
  async rejectUserDocuments(
    userId: number,
    adminId: number,
    reason: string,
  ): Promise<boolean> {
    const affected = await this.db.query(
      `UPDATE fc_users
       SET document_status = 'rejected', rejection_reason = ?, approved_by = ?, approved_at = ?
       WHERE id = ?`,
      [reason, adminId, nowDatetime(), userId],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }

  /** Model::update() on fc_users. */
  async updateUser(userId: number, data: Record<string, any>): Promise<boolean> {
    const cols = Object.keys(data);
    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    const affected = await this.db.query(
      `UPDATE fc_users SET ${setClause} WHERE id = ?`,
      [...cols.map((c) => data[c]), userId],
    );
    return (affected?.affectedRows ?? 0) > 0;
  }
}
