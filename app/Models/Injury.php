<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Injury Model
 * PSR-12 compliant - Handles injury history
 */
class Injury extends Model
{
    protected string $table = 'fc_injuries';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'injury_type',
        'severity',
        'date_of_injury',
        'recovery_date',
        'notes',
    ];

    /**
     * Get injuries for player
     *
     * @param int $playerId Player ID
     * @return array
     */
    public function getByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? ORDER BY date_of_injury DESC";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Create injury record
     *
     * @param array $data Injury data
     * @return int|false
     */
    public function createInjury(array $data): int|false
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
     * Soft delete injury record
     *
     * @param int $id Injury ID
     * @return bool
     */
    public function softDelete(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
    }
}
