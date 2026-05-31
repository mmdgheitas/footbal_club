<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Medical Model
 * PSR-12 compliant - Handles medical records
 */
class Medical extends Model
{
    protected string $table = 'fc_medical_records';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'blood_type',
        'allergies',
        'medical_conditions',
        'vaccination_status',
        'last_exam_date',
        'exam_notes',
    ];

    /**
     * Get medical record for player
     *
     * @param int $playerId Player ID
     * @return array|null
     */
    public function getByPlayerId(int $playerId): ?array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ?";
        return $this->db->findOne($query, [$playerId]);
    }

    /**
     * Create or update medical record
     *
     * @param array $data Medical data
     * @return int|false
     */
    public function createOrUpdate(array $data): int|false
    {
        $existing = $this->getByPlayerId($data['player_id']);

        if ($existing) {
            return $this->update($existing['id'], $data) ? $existing['id'] : false;
        }

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
     * Soft delete medical record
     *
     * @param int $id Record ID
     * @return bool
     */
    public function softDelete(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
    }
}
