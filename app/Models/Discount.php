<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Discount Model
 * PSR-12 compliant - Handles discount management
 */
class Discount extends Model
{
    protected string $table = 'fc_discounts';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'name',
        'amount',
        'percentage',
        'reason',
        'valid_from',
        'valid_to',
        'status',
    ];

    /**
     * Get discounts for player
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
     * Get active discounts for player
     *
     * @param int $playerId Player ID
     * @return array
     */
    public function getActiveByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} 
                  WHERE player_id = ? 
                  AND status = 1 
                  AND deleted_at IS NULL
                  AND (valid_from IS NULL OR valid_from <= CURDATE())
                  AND (valid_to IS NULL OR valid_to >= CURDATE())";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Calculate total discount amount for player
     *
     * @param int $playerId Player ID
     * @param float $baseAmount Base amount for percentage calculation
     * @return float
     */
    public function calculateTotalDiscount(int $playerId, float $baseAmount = 0): float
    {
        $discounts = $this->getActiveByPlayerId($playerId);
        $totalDiscount = 0;

        foreach ($discounts as $discount) {
            if (!empty($discount['amount'])) {
                $totalDiscount += $discount['amount'];
            } elseif (!empty($discount['percentage']) && $baseAmount > 0) {
                $totalDiscount += ($baseAmount * $discount['percentage'] / 100);
            }
        }

        return $totalDiscount;
    }

    /**
     * Create discount
     *
     * @param array $data Discount data
     * @return int|false
     */
    public function createDiscount(array $data): int|false
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
     * Soft delete discount
     *
     * @param int $id Discount ID
     * @return bool
     */
    public function softDelete(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
    }
}
