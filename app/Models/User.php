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
        'status',
        'last_login',
    ];
    protected array $hidden = ['password_hash'];

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
        $user = $this->findByEmail($email);

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

        return $this->insert($data);
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
