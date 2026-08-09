<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Achievement Model
 * Handles student achievements sent by admin
 */
class Achievement extends Model
{
    protected string $table = 'fc_achievements';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'user_id',
        'title',
        'description',
        'achievement_type',
        'points',
        'date_achieved',
        'created_by',
        'is_published',
    ];

    /**
     * Get achievements for a player
     *
     * @param int $playerId
     * @param bool $onlyPublished
     * @return array
     */
    public function getByPlayerId(int $playerId, bool $onlyPublished = true): array
    {
        $publishedCondition = $onlyPublished ? 'AND is_published = 1' : '';
        $query = "SELECT a.*, u.name as created_by_name
                  FROM {$this->table} a
                  LEFT JOIN fc_users u ON a.created_by = u.id
                  WHERE a.player_id = ? {$publishedCondition} AND a.deleted_at IS NULL
                  ORDER BY a.date_achieved DESC, a.created_at DESC";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Get achievements by type
     *
     * @param string $type
     * @return array
     */
    public function getByType(string $type): array
    {
        $query = "SELECT a.*, p.name as player_name, u.name as created_by_name
                  FROM {$this->table} a
                  LEFT JOIN fc_players p ON a.player_id = p.id
                  LEFT JOIN fc_users u ON a.created_by = u.id
                  WHERE a.achievement_type = ? AND a.deleted_at IS NULL
                  ORDER BY a.date_achieved DESC";
        return $this->db->findAll($query, [$type]);
    }

    /**
     * Get recent achievements
     *
     * @param int $limit
     * @return array
     */
    public function getRecent(int $limit = 10): array
    {
        $query = "SELECT a.*, p.name as player_name, u.name as created_by_name
                  FROM {$this->table} a
                  LEFT JOIN fc_players p ON a.player_id = p.id
                  LEFT JOIN fc_users u ON a.created_by = u.id
                  WHERE a.is_published = 1 AND a.deleted_at IS NULL
                  ORDER BY a.date_achieved DESC, a.created_at DESC
                  LIMIT ?";
        return $this->db->findAll($query, [$limit]);
    }

    /**
     * Get achievement by ID
     *
     * @param int $id
     * @return array|null
     */
    public function getAchievement(int $id): ?array
    {
        $query = "SELECT a.*, p.name as player_name, u.name as created_by_name
                  FROM {$this->table} a
                  LEFT JOIN fc_players p ON a.player_id = p.id
                  LEFT JOIN fc_users u ON a.created_by = u.id
                  WHERE a.id = ? AND a.deleted_at IS NULL";
        return $this->db->findOne($query, [$id]);
    }

    /**
     * Create achievement with UUID
     *
     * @param array $data
     * @return int|false
     */
    public function createAchievement(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
        $data['date_achieved'] = $data['date_achieved'] ?? date('Y-m-d');
        return $this->insert($data);
    }

    /**
     * Delete achievement
     *
     * @param int $id
     * @return bool
     */
    public function deleteAchievement(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
    }

    /**
     * Toggle publish status
     *
     * @param int $id
     * @param bool $publish
     * @return bool
     */
    public function togglePublish(int $id, bool $publish = true): bool
    {
        $query = "UPDATE {$this->table} SET is_published = ? WHERE id = ?";
        return $this->db->execute($query, [$publish ? 1 : 0, $id]) > 0;
    }

    /**
     * Get achievement statistics for a player
     *
     * @param int $playerId
     * @return array
     */
    public function getPlayerStats(int $playerId): array
    {
        $query = "SELECT achievement_type, COUNT(*) as count, SUM(points) as total_points
                  FROM {$this->table}
                  WHERE player_id = ? AND is_published = 1 AND deleted_at IS NULL
                  GROUP BY achievement_type";
        $byType = $this->db->findAll($query, [$playerId]);
        
        $query = "SELECT COUNT(*) as total, SUM(points) as total_points
                  FROM {$this->table}
                  WHERE player_id = ? AND is_published = 1 AND deleted_at IS NULL";
        $total = $this->db->findOne($query, [$playerId]);
        
        return [
            'by_type' => $byType,
            'total' => (int)($total['total'] ?? 0),
            'total_points' => (int)($total['total_points'] ?? 0),
        ];
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
