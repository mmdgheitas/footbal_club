<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Payment Model
 * PSR-12 compliant - Handles financial transactions
 */
class Payment extends Model
{
    protected string $table = 'fc_payments';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'amount',
        'description',
        'payment_method',
        'reference_number',
        'status',
        'receipt_path',
    ];

    /**
     * Get payments for player
     *
     * @param int $playerId Player ID
     * @return array
     */
    public function getByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? AND deleted_at IS NULL ORDER BY created_at DESC";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Get completed payments for player
     *
     * @param int $playerId Player ID
     * @return array
     */
    public function getCompletedByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? AND status = 'completed' AND deleted_at IS NULL";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Calculate total paid by player
     *
     * @param int $playerId Player ID
     * @return float
     */
    public function getTotalPaidByPlayer(int $playerId): float
    {
        $query = "SELECT SUM(amount) as total FROM {$this->table} WHERE player_id = ? AND status = 'completed' AND deleted_at IS NULL";
        $result = $this->db->findOne($query, [$playerId]);
        return (float)($result['total'] ?? 0);
    }

    /**
     * Get outstanding payments (pending + failed)
     *
     * @param int $playerId Player ID
     * @return array
     */
    public function getOutstandingByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? AND status IN ('pending', 'failed') AND deleted_at IS NULL";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Calculate total outstanding for player
     *
     * @param int $playerId Player ID
     * @return float
     */
    public function getTotalOutstandingByPlayer(int $playerId): float
    {
        $query = "SELECT SUM(amount) as total FROM {$this->table} WHERE player_id = ? AND status IN ('pending', 'failed') AND deleted_at IS NULL";
        $result = $this->db->findOne($query, [$playerId]);
        return (float)($result['total'] ?? 0);
    }

    /**
     * Record payment
     *
     * @param array $data Payment data
     * @return int|false
     */
    public function recordPayment(array $data): int|false
    {
        try {
            $this->db->beginTransaction();

            // Insert payment record
            $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
            $paymentId = $this->insert($data);

            if (!$paymentId) {
                $this->db->rollback();
                return false;
            }

            // Log transaction (double-entry)
            $transactionLog = new TransactionLog();
            $this->logTransaction($paymentId, $data);

            $this->db->commit();
            return $paymentId;
        } catch (\Exception $e) {
            $this->db->rollback();
            return false;
        }
    }

    /**
     * Log transaction in transaction log
     *
     * @param int $paymentId Payment ID
     * @param array $data Payment data
     * @return void
     */
    private function logTransaction(int $paymentId, array $data): void
    {
        $transactionLog = new TransactionLog();

        // Credit entry
        $transactionLog->insert([
            'uuid' => $this->generateUuid(),
            'payment_id' => $paymentId,
            'entry_type' => 'credit',
            'amount' => $data['amount'],
            'account_code' => 'REVENUE-001',
            'description' => $data['description'] ?? 'Payment received',
        ]);

        // Debit entry (if applicable)
        if ($data['status'] === 'completed') {
            $transactionLog->insert([
                'uuid' => $this->generateUuid(),
                'payment_id' => $paymentId,
                'entry_type' => 'debit',
                'amount' => $data['amount'],
                'account_code' => 'BANK-001',
                'description' => 'Deposit to bank',
            ]);
        }
    }

    /**
     * Get monthly revenue
     *
     * @param int $month Month (1-12)
     * @param int $year Year
     * @return float
     */
    public function getMonthlyRevenue(int $month, int $year): float
    {
        $query = "SELECT SUM(amount) as total FROM {$this->table} 
                  WHERE YEAR(created_at) = ? AND MONTH(created_at) = ? AND status = 'completed' AND deleted_at IS NULL";
        $result = $this->db->findOne($query, [$year, $month]);
        return (float)($result['total'] ?? 0);
    }

    /**
     * Get all monthly revenue for year
     *
     * @param int $year Year
     * @return array
     */
    public function getYearlyRevenue(int $year): array
    {
        $query = "SELECT MONTH(created_at) as month, SUM(amount) as total FROM {$this->table} 
                  WHERE YEAR(created_at) = ? AND status = 'completed' AND deleted_at IS NULL 
                  GROUP BY MONTH(created_at) ORDER BY month ASC";
        return $this->db->findAll($query, [$year]);
    }

    /**
     * Get outstanding debts report
     *
     * @return array
     */
    public function getDebtsReport(): array
    {
        $query = "SELECT 
                    p.id, 
                    p.uuid, 
                    p.name, 
                    p.email,
                    COUNT(pm.id) as pending_count,
                    SUM(CASE WHEN pm.status IN ('pending', 'failed') THEN pm.amount ELSE 0 END) as total_outstanding
                  FROM fc_players p
                  LEFT JOIN {$this->table} pm ON p.id = pm.player_id AND pm.status IN ('pending', 'failed') AND pm.deleted_at IS NULL
                  WHERE p.status = 1 AND p.deleted_at IS NULL
                  GROUP BY p.id, p.uuid, p.name, p.email
                  HAVING total_outstanding > 0
                  ORDER BY total_outstanding DESC";
        return $this->db->findAll($query);
    }

    /**
     * Create payment with UUID
     *
     * @param array $data Payment data
     * @return int|false
     */
    public function createPayment(array $data): int|false
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
     * Soft delete payment
     *
     * @param int $id Payment ID
     * @return bool
     */
    public function softDelete(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
    }
}
