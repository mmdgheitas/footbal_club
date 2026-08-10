<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * User Model
 * PSR-12 compliant - Handles user-related database operations
 */
class User extends Model
{
    protected string $table = 'fc_users';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'name',
        'email',
        'phone',
        'password_hash',
        'role',
        'player_id',
        'status',
        'document_status',
        'rejection_reason',
        'approved_by',
        'approved_at',
        'last_login',
    ];
    protected array $hidden = ['password_hash', 'rejection_reason'];

    /**
     * Find user by email
     *
     * @param string $email User email
     * @return array|null
     */
    public function findByEmail(string $email): ?array
    {
        return $this->findBy('email', $email);
    }

    /**
     * Find active (non-deleted) user by email
     *
     * @param string $email User email
     * @return array|null
     */
    public function findActiveByEmail(string $email): ?array
    {
        $query = "SELECT * FROM {$this->table} WHERE email = ? AND deleted_at IS NULL";
        return $this->db->findOne($query, [$email]);
    }

    /**
     * Verify password
     *
     * @param string $password Plain text password
     * @param string $hash Password hash
     * @return bool
     */
    public function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    /**
     * Hash password
     *
     * @param string $password Plain text password
     * @return string
     */
    public function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    }

    /**
     * Update last login
     *
     * @param int $userId User ID
     * @return bool
     */
    public function updateLastLogin(int $userId): bool
    {
        return $this->update($userId, ['last_login' => date(DATETIME_FORMAT)]);
    }

    /**
     * Get users by role
     *
     * @param string $role User role
     * @return array
     */
    public function getByRole(string $role): array
    {
        return $this->findAllBy('role', $role);
    }

    /**
     * Get active users
     *
     * @return array
     */
    public function getActive(): array
    {
        $query = "SELECT * FROM {$this->table} WHERE status = 1 AND deleted_at IS NULL";
        return $this->db->findAll($query);
    }

    /**
     * Authenticate user
     *
     * @param string $email User email
     * @param string $password User password
     * @return array|null
     */
    public function authenticate(string $email, string $password): ?array
    {
        $user = $this->findActiveByEmail($email);

        if ($user === null || !$this->verifyPassword($password, $user['password_hash'])) {
            return null;
        }

        // Update last login
        $this->updateLastLogin($user['id']);

        // Remove sensitive data
        unset($user['password_hash']);

        return $user;
    }

    /**
     * Create new user
     *
     * @param array $data User data
     * @return int|false
     */
    public function createUser(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
        $data['password_hash'] = $this->hashPassword($data['password'] ?? 'password123');
        unset($data['password']);

        // Set default document status for player role
        if (($data['role'] ?? '') === 'player') {
            $data['document_status'] = $data['document_status'] ?? 'pending';
        }

        return $this->insert($data);
    }

    /**
     * Approve user documents
     *
     * @param int $userId
     * @param int $adminId
     * @return bool
     */
    public function approveDocuments(int $userId, int $adminId): bool
    {
        $data = [
            'document_status' => 'approved',
            'approved_by' => $adminId,
            'approved_at' => date(DATETIME_FORMAT),
            'status' => 1, // Activate user account
        ];
        return $this->update($userId, $data);
    }

    /**
     * Reject user documents
     *
     * @param int $userId
     * @param int $adminId
     * @param string $reason
     * @return bool
     */
    public function rejectDocuments(int $userId, int $adminId, string $reason): bool
    {
        $data = [
            'document_status' => 'rejected',
            'rejection_reason' => $reason,
            'approved_by' => $adminId,
            'approved_at' => date(DATETIME_FORMAT),
        ];
        return $this->update($userId, $data);
    }

    /**
     * Get users with pending documents
     *
     * @return array
     */
    public function getUsersWithPendingDocuments(): array
    {
        $query = "SELECT * FROM {$this->table} 
                  WHERE document_status = 'pending' AND deleted_at IS NULL
                  ORDER BY created_at ASC";
        return $this->db->findAll($query);
    }

    /**
     * Get users by document status
     *
     * @param string $status
     * @return array
     */
    public function getUsersByDocumentStatus(string $status): array
    {
        $query = "SELECT * FROM {$this->table} 
                  WHERE document_status = ? AND deleted_at IS NULL
                  ORDER BY created_at DESC";
        return $this->db->findAll($query, [$status]);
    }

    /**
     * Link user to player
     *
     * @param int $userId
     * @param int $playerId
     * @return bool
     */
    public function linkToPlayer(int $userId, int $playerId): bool
    {
        return $this->update($userId, ['player_id' => $playerId]);
    }

    /**
     * Get user with player info
     *
     * @param int $userId
     * @return array|null
     */
    public function getWithPlayer(int $userId): ?array
    {
        $user = $this->find($userId);
        if ($user === null) {
            return null;
        }

        if (!empty($user['player_id'])) {
            $playerModel = new Player();
            $user['player'] = $playerModel->find((int)$user['player_id']);
        } else {
            $user['player'] = null;
        }

        return $user;
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
