<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Guardian Model
 * PSR-12 compliant - Handles guardian-related database operations
 */
class Guardian extends Model
{
    protected string $table = 'fc_guardians';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'name',
        'relationship',
        'phone',
        'email',
        'address',
    ];

    /**
     * Get guardians for a player
     *
     * @param int $playerId Player ID
     * @return array
     */
    public function getByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? AND deleted_at IS NULL";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Create guardian with UUID
     *
     * @param array $data Guardian data
     * @return int|false
     */
    public function createGuardian(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
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

    /**
     * Soft delete guardian
     *
     * @param int $id Guardian ID
     * @return bool
     */
    public function softDelete(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
    }
}
