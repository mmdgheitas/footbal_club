<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Homework Video Model
 * Handles student homework video submissions
 */
class HomeworkVideo extends Model
{
    protected string $table = 'fc_homework_videos';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'user_id',
        'classroom_id',
        'title',
        'description',
        'video_path',
        'original_filename',
        'stored_filename',
        'mime_type',
        'file_size',
        'duration_seconds',
        'status',
        'coach_feedback',
        'coach_rating',
        'reviewed_by',
        'reviewed_at',
    ];

    /**
     * Get all homework videos for a player
     *
     * @param int $playerId
     * @return array
     */
    public function getByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? AND deleted_at IS NULL ORDER BY created_at DESC";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Get all homework videos for a classroom
     *
     * @param int $classroomId
     * @return array
     */
    public function getByClassroomId(int $classroomId): array
    {
        $query = "SELECT hv.*, p.name as player_name, u.name as user_name
                  FROM {$this->table} hv
                  LEFT JOIN fc_players p ON hv.player_id = p.id
                  LEFT JOIN fc_users u ON hv.user_id = u.id
                  WHERE hv.classroom_id = ? AND hv.deleted_at IS NULL
                  ORDER BY hv.created_at DESC";
        return $this->db->findAll($query, [$classroomId]);
    }

    /**
     * Get all homework videos for a coach's players
     *
     * @param int $coachId
     * @return array
     */
    public function getByCoachId(int $coachId): array
    {
        // Get classrooms taught by this coach
        $classroomModel = new Classroom();
        $classrooms = $classroomModel->findAllBy('coach_id', (string)$coachId);
        
        if (empty($classrooms)) {
            return [];
        }
        
        $classroomIds = array_map(fn($c) => (int)$c['id'], $classrooms);
        $placeholders = implode(',', array_fill(0, count($classroomIds), '?'));
        
        $query = "SELECT hv.*, p.name as player_name, u.name as user_name, c.name as classroom_name
                  FROM {$this->table} hv
                  LEFT JOIN fc_players p ON hv.player_id = p.id
                  LEFT JOIN fc_users u ON hv.user_id = u.id
                  LEFT JOIN fc_classrooms c ON hv.classroom_id = c.id
                  WHERE hv.classroom_id IN ({$placeholders}) AND hv.deleted_at IS NULL
                  ORDER BY hv.created_at DESC";
        
        return $this->db->findAll($query, $classroomIds);
    }

    /**
     * Get pending homework videos (not yet reviewed)
     *
     * @return array
     */
    public function getPending(): array
    {
        $query = "SELECT hv.*, p.name as player_name, u.name as user_name, c.name as classroom_name
                  FROM {$this->table} hv
                  LEFT JOIN fc_players p ON hv.player_id = p.id
                  LEFT JOIN fc_users u ON hv.user_id = u.id
                  LEFT JOIN fc_classrooms c ON hv.classroom_id = c.id
                  WHERE hv.status = 'submitted' AND hv.deleted_at IS NULL
                  ORDER BY hv.created_at ASC";
        return $this->db->findAll($query);
    }

    /**
     * Get homework video by ID
     *
     * @param int $id
     * @return array|null
     */
    public function getVideo(int $id): ?array
    {
        $query = "SELECT hv.*, p.name as player_name, u.name as user_name, c.name as classroom_name
                  FROM {$this->table} hv
                  LEFT JOIN fc_players p ON hv.player_id = p.id
                  LEFT JOIN fc_users u ON hv.user_id = u.id
                  LEFT JOIN fc_classrooms c ON hv.classroom_id = c.id
                  WHERE hv.id = ? AND hv.deleted_at IS NULL";
        return $this->db->findOne($query, [$id]);
    }

    /**
     * Review a homework video
     *
     * @param int $id
     * @param int $coachId
     * @param string $feedback
     * @param int|null $rating (1-5)
     * @return bool
     */
    public function review(int $id, int $coachId, string $feedback, ?int $rating = null): bool
    {
        $status = 'reviewed';
        if ($rating !== null && $rating >= 1 && $rating <= 5) {
            $status = 'approved';
        }
        
        $query = "UPDATE {$this->table} SET status = ?, coach_feedback = ?, coach_rating = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?";
        return $this->db->execute($query, [$status, $feedback, $rating, $coachId, date(DATETIME_FORMAT), $id]) > 0;
    }

    /**
     * Create homework video with UUID
     *
     * @param array $data
     * @return int|false
     */
    public function createVideo(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
        return $this->insert($data);
    }

    /**
     * Count videos by player
     *
     * @param int $playerId
     * @return int
     */
    public function countByPlayer(int $playerId): int
    {
        $query = "SELECT COUNT(*) as count FROM {$this->table} WHERE player_id = ? AND deleted_at IS NULL";
        $result = $this->db->findOne($query, [$playerId]);
        return (int)($result['count'] ?? 0);
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
