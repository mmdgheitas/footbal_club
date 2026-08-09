<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Classroom Model
 * PSR-12 compliant - Handles classroom-related database operations
 */
class Classroom extends Model
{
    protected string $table = 'fc_classrooms';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'name',
        'description',
        'coach_id',
    ];

    /**
     * Get roster of players in a specific classroom
     *
     * @param int $classroomId
     * @return array
     */
    public function getRoster(int $classroomId): array
    {
        $query = "SELECT * FROM fc_players WHERE classroom_id = ? AND status = 1 AND deleted_at IS NULL ORDER BY name ASC";
        return $this->db->findAll($query, [$classroomId]);
    }

    /**
     * Get list of active players who are NOT in a classroom
     *
     * @return array
     */
    public function getUnassignedPlayers(): array
    {
        $query = "SELECT * FROM fc_players WHERE classroom_id IS NULL AND status = 1 AND deleted_at IS NULL ORDER BY name ASC";
        return $this->db->findAll($query);
    }

    /**
     * Get list of all active players (to assign, optionally including the ones already in this classroom)
     *
     * @param int $excludeClassroomId Optionally exclude players already in this classroom
     * @return array
     */
    public function getAvailablePlayersForClassroom(int $excludeClassroomId): array
    {
        $query = "SELECT * FROM fc_players WHERE (classroom_id IS NULL OR classroom_id != ?) AND status = 1 AND deleted_at IS NULL ORDER BY name ASC";
        return $this->db->findAll($query, [$excludeClassroomId]);
    }

    /**
     * Create classroom with UUID
     *
     * @param array $data
     * @return int|false
     */
    public function createClassroom(array $data): int|false
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
}
