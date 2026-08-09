<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Alert Model
 * PSR-12 compliant - Handles alert/announcement database operations
 */
class Alert extends Model
{
    protected string $table = 'fc_alerts';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'title',
        'message',
        'target_audience',
        'target_type',
        'target_id',
        'target_age_min',
        'target_age_max',
        'created_by',
        'priority',
        'expires_at',
        'deleted_at',
    ];

    /**
     * Get alerts for a player based on their age category and other targeting
     *
     * @param string $ageCategory Player's age category (e.g. 'u10')
     * @param int|null $playerId Player ID
     * @param int|null $classroomId Classroom ID
     * @return array
     */
    public function getAlertsForPlayer(string $ageCategory, ?int $playerId = null, ?int $classroomId = null): array
    {
        // Get age range for the age category
        $ageRange = AGE_CATEGORIES[$ageCategory] ?? ['min' => 0, 'max' => 100];
        $minAge = $ageRange['min'];
        $maxAge = $ageRange['max'];
        
        $query = "SELECT a.*, u.name as author_name FROM {$this->table} a
                  LEFT JOIN fc_users u ON a.created_by = u.id
                  WHERE a.deleted_at IS NULL AND (
                      a.target_type = 'all'
                      OR (a.target_type = 'age_range' AND a.target_age_min <= ? AND a.target_age_max >= ?)
                      OR (a.target_type = 'class' AND a.target_id = ?)
                      OR (a.target_type = 'player' AND a.target_id = ?)
                      OR (a.target_type IS NULL AND a.target_audience = 'all')
                      OR (a.target_audience = ?)
                  )";
        
        $params = [$minAge, $maxAge, $classroomId, $playerId, $ageCategory];
        
        // Add expiration check
        $query .= " AND (a.expires_at IS NULL OR a.expires_at > ?)";
        $params[] = date(DATETIME_FORMAT);
        
        $query .= " ORDER BY 
                    CASE a.priority
                        WHEN 'urgent' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                        ELSE 5
                    END, 
                    a.created_at DESC";
        
        return $this->db->findAll($query, $params);
    }

    /**
     * Get all active alerts
     *
     * @return array
     */
    public function getActiveAlerts(): array
    {
        $query = "SELECT a.*, u.name as author_name FROM {$this->table} a
                  LEFT JOIN fc_users u ON a.created_by = u.id
                  WHERE a.deleted_at IS NULL
                  ORDER BY a.created_at DESC";
        return $this->db->findAll($query);
    }

    /**
     * Create alert with UUID
     *
     * @param array $data Alert data
     * @return int|false
     */
    public function createAlert(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
        return $this->insert($data);
    }

    /**
     * Soft delete alert
     *
     * @param int $id Alert ID
     * @return bool
     */
    public function softDelete(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
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
