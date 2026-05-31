<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * SMS Log Model
 * PSR-12 compliant - Tracks SMS communications
 */
class SmsLog extends Model
{
    protected string $table = 'fc_sms_logs';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'recipient_phone',
        'message',
        'sms_type',
        'provider',
        'provider_message_id',
        'status',
        'error_message',
        'sent_at',
    ];

    /**
     * Get SMS logs for player
     *
     * @param int $playerId Player ID
     * @return array
     */
    public function getByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? ORDER BY created_at DESC";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Get SMS logs by status
     *
     * @param string $status SMS status
     * @return array
     */
    public function getByStatus(string $status): array
    {
        $query = "SELECT * FROM {$this->table} WHERE status = ? ORDER BY created_at DESC";
        return $this->db->findAll($query, [$status]);
    }

    /**
     * Get pending SMS
     *
     * @return array
     */
    public function getPending(): array
    {
        return $this->getByStatus('pending');
    }

    /**
     * Get SMS by type
     *
     * @param string $smsType SMS type
     * @return array
     */
    public function getByType(string $smsType): array
    {
        $query = "SELECT * FROM {$this->table} WHERE sms_type = ? ORDER BY created_at DESC";
        return $this->db->findAll($query, [$smsType]);
    }

    /**
     * Log SMS
     *
     * @param array $data SMS data
     * @return int|false
     */
    public function logSms(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
        return $this->insert($data);
    }

    /**
     * Update SMS status
     *
     * @param int $id SMS ID
     * @param string $status New status
     * @param string|null $providerId Provider message ID
     * @param string|null $error Error message
     * @return bool
     */
    public function updateStatus(int $id, string $status, ?string $providerId = null, ?string $error = null): bool
    {
        $data = [
            'status' => $status,
            'provider_message_id' => $providerId ?? null,
            'error_message' => $error ?? null,
        ];

        if ($status === 'sent' || $status === 'delivered') {
            $data['sent_at'] = date(DATETIME_FORMAT);
        }

        return $this->update($id, $data);
    }

    /**
     * Get SMS statistics
     *
     * @return array
     */
    public function getStatistics(): array
    {
        $query = "SELECT 
                    status,
                    sms_type,
                    COUNT(*) as count
                  FROM {$this->table} 
                  WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                  GROUP BY status, sms_type";
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
