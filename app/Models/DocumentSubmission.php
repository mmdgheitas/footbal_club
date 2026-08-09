<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Document Submission Model
 * Handles student document uploads and approval workflow
 */
class DocumentSubmission extends Model
{
    protected string $table = 'fc_document_submissions';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'user_id',
        'player_id',
        'document_type',
        'file_path',
        'original_filename',
        'stored_filename',
        'mime_type',
        'file_size',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    /**
     * Get all document submissions for a user
     *
     * @param int $userId
     * @return array
     */
    public function getByUserId(int $userId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC";
        return $this->db->findAll($query, [$userId]);
    }

    /**
     * Get all document submissions for a player
     *
     * @param int $playerId
     * @return array
     */
    public function getByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? AND deleted_at IS NULL ORDER BY created_at DESC";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Get pending document submissions
     *
     * @return array
     */
    public function getPending(): array
    {
        $query = "SELECT ds.*, u.name as user_name, u.email as user_email, p.name as player_name
                  FROM {$this->table} ds
                  LEFT JOIN fc_users u ON ds.user_id = u.id
                  LEFT JOIN fc_players p ON ds.player_id = p.id
                  WHERE ds.status = 'pending' AND ds.deleted_at IS NULL
                  ORDER BY ds.created_at ASC";
        return $this->db->findAll($query);
    }

    /**
     * Get all submissions by status
     *
     * @param string $status
     * @return array
     */
    public function getByStatus(string $status): array
    {
        $query = "SELECT ds.*, u.name as user_name, u.email as user_email, p.name as player_name
                  FROM {$this->table} ds
                  LEFT JOIN fc_users u ON ds.user_id = u.id
                  LEFT JOIN fc_players p ON ds.player_id = p.id
                  WHERE ds.status = ? AND ds.deleted_at IS NULL
                  ORDER BY ds.created_at DESC";
        return $this->db->findAll($query, [$status]);
    }

    /**
     * Check if user has all required documents approved
     *
     * @param int $userId
     * @return bool
     */
    public function hasAllDocumentsApproved(int $userId): bool
    {
        $requiredTypes = ['national_id', 'medical_clearance', 'birth_certificate'];
        
        foreach ($requiredTypes as $type) {
            $query = "SELECT COUNT(*) as count FROM {$this->table} 
                      WHERE user_id = ? AND document_type = ? AND status = 'approved' AND deleted_at IS NULL";
            $result = $this->db->findOne($query, [$userId, $type]);
            if ((int)($result['count'] ?? 0) === 0) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check if user has submitted all required documents
     *
     * @param int $userId
     * @return bool
     */
    public function hasAllDocumentsSubmitted(int $userId): bool
    {
        $requiredTypes = ['national_id', 'medical_clearance', 'birth_certificate'];
        
        foreach ($requiredTypes as $type) {
            $query = "SELECT COUNT(*) as count FROM {$this->table} 
                      WHERE user_id = ? AND document_type = ? AND deleted_at IS NULL";
            $result = $this->db->findOne($query, [$userId, $type]);
            if ((int)($result['count'] ?? 0) === 0) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get required documents for a user
     *
     * @param int $userId
     * @return array
     */
    public function getRequiredDocumentsStatus(int $userId): array
    {
        $requiredTypes = ['national_id', 'medical_clearance', 'birth_certificate'];
        $status = [];
        
        foreach ($requiredTypes as $type) {
            $query = "SELECT id, status, rejection_reason, original_filename, created_at 
                      FROM {$this->table} 
                      WHERE user_id = ? AND document_type = ? AND deleted_at IS NULL
                      ORDER BY created_at DESC LIMIT 1";
            $doc = $this->db->findOne($query, [$userId, $type]);
            
            $status[$type] = [
                'submitted' => $doc !== null,
                'status' => $doc['status'] ?? 'not_submitted',
                'rejection_reason' => $doc['rejection_reason'] ?? null,
                'filename' => $doc['original_filename'] ?? null,
                'submitted_at' => $doc['created_at'] ?? null,
                'id' => $doc['id'] ?? null,
            ];
        }
        
        return $status;
    }

    /**
     * Approve a document submission
     *
     * @param int $id
     * @param int $reviewerId
     * @return bool
     */
    public function approve(int $id, int $reviewerId): bool
    {
        $query = "UPDATE {$this->table} SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?";
        return $this->db->execute($query, [$reviewerId, date(DATETIME_FORMAT), $id]) > 0;
    }

    /**
     * Reject a document submission
     *
     * @param int $id
     * @param int $reviewerId
     * @param string $reason
     * @return bool
     */
    public function reject(int $id, int $reviewerId, string $reason): bool
    {
        $query = "UPDATE {$this->table} SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?";
        return $this->db->execute($query, [$reason, $reviewerId, date(DATETIME_FORMAT), $id]) > 0;
    }

    /**
     * Create document submission with UUID
     *
     * @param array $data
     * @return int|false
     */
    public function createSubmission(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
        return $this->insert($data);
    }

    /**
     * Get document by ID
     *
     * @param int $id
     * @return array|null
     */
    public function getDocument(int $id): ?array
    {
        $query = "SELECT ds.*, u.name as user_name, u.email as user_email, p.name as player_name
                  FROM {$this->table} ds
                  LEFT JOIN fc_users u ON ds.user_id = u.id
                  LEFT JOIN fc_players p ON ds.player_id = p.id
                  WHERE ds.id = ? AND ds.deleted_at IS NULL";
        return $this->db->findOne($query, [$id]);
    }

    /**
     * Generate UUID
     *
     * @return string
     */
    private function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
