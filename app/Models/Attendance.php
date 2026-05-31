<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Attendance Model
 * PSR-12 compliant - Handles attendance tracking
 */
class Attendance extends Model
{
    protected string $table = 'fc_attendance';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'session_date',
        'status',
        'recorded_by',
    ];

    /**
     * Get attendance for player
     *
     * @param int $playerId Player ID
     * @return array
     */
    public function getByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? ORDER BY session_date DESC";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Get attendance for player on date
     *
     * @param int $playerId Player ID
     * @param string $date Date (Y-m-d format)
     * @return array|null
     */
    public function getByPlayerAndDate(int $playerId, string $date): ?array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? AND session_date = ?";
        return $this->db->findOne($query, [$playerId, $date]);
    }

    /**
     * Mark attendance
     *
     * @param int $playerId Player ID
     * @param string $date Session date
     * @param int $status Attendance status
     * @param int $userId User ID
     * @return int|bool
     */
    public function markAttendance(int $playerId, string $date, int $status, int $userId): int|bool
    {
        $existing = $this->getByPlayerAndDate($playerId, $date);

        if ($existing) {
            return $this->update($existing['id'], [
                'status' => $status,
                'recorded_by' => $userId,
            ]);
        }

        return $this->insert([
            'uuid' => $this->generateUuid(),
            'player_id' => $playerId,
            'session_date' => $date,
            'status' => $status,
            'recorded_by' => $userId,
        ]);
    }

    /**
     * Get attendance percentage for player
     *
     * @param int $playerId Player ID
     * @return float
     */
    public function getAttendancePercentage(int $playerId): float
    {
        $query = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as present
                  FROM {$this->table} 
                  WHERE player_id = ?";
        $result = $this->db->findOne($query, [$playerId]);

        if ($result['total'] == 0) {
            return 0;
        }

        return ($result['present'] / $result['total']) * 100;
    }

    /**
     * Get players with low attendance
     *
     * @param float $threshold Attendance threshold percentage
     * @return array
     */
    public function getPlayersWithLowAttendance(float $threshold = ATTENDANCE_WARNING_THRESHOLD): array
    {
        $query = "SELECT 
                    p.id,
                    p.uuid,
                    p.name,
                    p.email,
                    COUNT(a.id) as total_sessions,
                    SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END) as present_sessions,
                    ROUND((SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 2) as attendance_percentage
                  FROM fc_players p
                  LEFT JOIN {$this->table} a ON p.id = a.player_id
                  WHERE p.status = 1 AND p.deleted_at IS NULL
                  GROUP BY p.id, p.uuid, p.name, p.email
                  HAVING attendance_percentage < ?
                  ORDER BY attendance_percentage ASC";
        return $this->db->findAll($query, [$threshold]);
    }

    /**
     * Get attendance for session date
     *
     * @param string $date Session date
     * @return array
     */
    public function getBySessionDate(string $date): array
    {
        $query = "SELECT * FROM {$this->table} WHERE session_date = ? ORDER BY player_id ASC";
        return $this->db->findAll($query, [$date]);
    }

    /**
     * Get attendance statistics
     *
     * @return array
     */
    public function getStatistics(): array
    {
        $query = "SELECT 
                    status,
                    COUNT(*) as count
                  FROM {$this->table} 
                  WHERE session_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                  GROUP BY status";
        return $this->db->findAll($query);
    }

    /**
     * Create attendance record
     *
     * @param array $data Attendance data
     * @return int|false
     */
    public function createAttendance(array $data): int|false
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
