<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Case Note Model
 * Handles case notes for students (admin can send achievements/concerns)
 */
class CaseNote extends Model
{
    protected string $table = 'fc_case_notes';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'user_id',
        'note_type',
        'title',
        'content',
        'severity',
        'created_by',
        'is_visible_to_player',
    ];

    /**
     * Get case notes for a player
     *
     * @param int $playerId
     * @param bool $onlyVisible
     * @return array
     */
    public function getByPlayerId(int $playerId, bool $onlyVisible = false): array
    {
        $visibleCondition = $onlyVisible ? 'AND is_visible_to_player = 1' : '';
        $query = "SELECT cn.*, u.name as created_by_name
                  FROM {$this->table} cn
                  LEFT JOIN fc_users u ON cn.created_by = u.id
                  WHERE cn.player_id = ? {$visibleCondition} AND cn.deleted_at IS NULL
                  ORDER BY cn.created_at DESC";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Get case notes by type
     *
     * @param string $type
     * @return array
     */
    public function getByType(string $type): array
    {
        $query = "SELECT cn.*, p.name as player_name, u.name as created_by_name
                  FROM {$this->table} cn
                  LEFT JOIN fc_players p ON cn.player_id = p.id
                  LEFT JOIN fc_users u ON cn.created_by = u.id
                  WHERE cn.note_type = ? AND cn.deleted_at IS NULL
                  ORDER BY cn.created_at DESC";
        return $this->db->findAll($query, [$type]);
    }

    /**
     * Get case notes by severity
     *
     * @param string $severity
     * @return array
     */
    public function getBySeverity(string $severity): array
    {
        $query = "SELECT cn.*, p.name as player_name, u.name as created_by_name
                  FROM {$this->table} cn
                  LEFT JOIN fc_players p ON cn.player_id = p.id
                  LEFT JOIN fc_users u ON cn.created_by = u.id
                  WHERE cn.severity = ? AND cn.deleted_at IS NULL
                  ORDER BY cn.created_at DESC";
        return $this->db->findAll($query, [$severity]);
    }

    /**
     * Get case note by ID
     *
     * @param int $id
     * @return array|null
     */
    public function getCaseNote(int $id): ?array
    {
        $query = "SELECT cn.*, p.name as player_name, u.name as created_by_name
                  FROM {$this->table} cn
                  LEFT JOIN fc_players p ON cn.player_id = p.id
                  LEFT JOIN fc_users u ON cn.created_by = u.id
                  WHERE cn.id = ? AND cn.deleted_at IS NULL";
        return $this->db->findOne($query, [$id]);
    }

    /**
     * Create case note with UUID
     *
     * @param array $data
     * @return int|false
     */
    public function createCaseNote(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
        return $this->insert($data);
    }

    /**
     * Update case note visibility
     *
     * @param int $id
     * @param bool $visible
     * @return bool
     */
    public function updateVisibility(int $id, bool $visible): bool
    {
        $query = "UPDATE {$this->table} SET is_visible_to_player = ? WHERE id = ?";
        return $this->db->execute($query, [$visible ? 1 : 0, $id]) > 0;
    }

    /**
     * Delete case note
     *
     * @param int $id
     * @return bool
     */
    public function deleteCaseNote(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
    }

    /**
     * Get case note count by player
     *
     * @param int $playerId
     * @return array
     */
    public function getCountsByPlayer(int $playerId): array
    {
        $query = "SELECT note_type, severity, COUNT(*) as count
                  FROM {$this->table}
                  WHERE player_id = ? AND deleted_at IS NULL
                  GROUP BY note_type, severity";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Get high severity case notes (for admin dashboard)
     *
     * @return array
     */
    public function getHighSeverityNotes(): array
    {
        $query = "SELECT cn.*, p.name as player_name, u.name as created_by_name
                  FROM {$this->table} cn
                  LEFT JOIN fc_players p ON cn.player_id = p.id
                  LEFT JOIN fc_users u ON cn.created_by = u.id
                  WHERE cn.severity = 'high' AND cn.deleted_at IS NULL
                  ORDER BY cn.created_at DESC
                  LIMIT 20";
        return $this->db->findAll($query);
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
