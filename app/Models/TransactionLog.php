<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * TransactionLog Model
 * PSR-12 compliant - Double-entry bookkeeping for financial tracking
 */
class TransactionLog extends Model
{
    protected string $table = 'fc_transaction_logs';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'payment_id',
        'entry_type',
        'amount',
        'account_code',
        'description',
    ];

    /**
     * Get transactions for payment
     *
     * @param int $paymentId Payment ID
     * @return array
     */
    public function getByPaymentId(int $paymentId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE payment_id = ? ORDER BY created_at DESC";
        return $this->db->findAll($query, [$paymentId]);
    }

    /**
     * Get all debit transactions
     *
     * @return array
     */
    public function getAllDebits(): array
    {
        $query = "SELECT * FROM {$this->table} WHERE entry_type = 'debit' ORDER BY created_at DESC";
        return $this->db->findAll($query);
    }

    /**
     * Get all credit transactions
     *
     * @return array
     */
    public function getAllCredits(): array
    {
        $query = "SELECT * FROM {$this->table} WHERE entry_type = 'credit' ORDER BY created_at DESC";
        return $this->db->findAll($query);
    }

    /**
     * Get total debits
     *
     * @return float
     */
    public function getTotalDebits(): float
    {
        $query = "SELECT SUM(amount) as total FROM {$this->table} WHERE entry_type = 'debit'";
        $result = $this->db->findOne($query);
        return (float)($result['total'] ?? 0);
    }

    /**
     * Get total credits
     *
     * @return float
     */
    public function getTotalCredits(): float
    {
        $query = "SELECT SUM(amount) as total FROM {$this->table} WHERE entry_type = 'credit'";
        $result = $this->db->findOne($query);
        return (float)($result['total'] ?? 0);
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
