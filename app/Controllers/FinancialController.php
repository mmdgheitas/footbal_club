<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Payment;
use App\Models\TransactionLog;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Financial Controller
 * PSR-12 compliant - Handles financial transactions and reports
 */
class FinancialController extends Controller
{
    private Payment $paymentModel;
    private TransactionLog $transactionLogModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->paymentModel = new Payment();
        $this->transactionLogModel = new TransactionLog();
    }

    /**
     * List payments
     *
     * @return void
     */
    public function index(): void
    {
        RbacMiddleware::requirePermission('view_payments');

        $page = (int)($this->get('page') ?? 1);

        $query = "SELECT p.*, pl.name as player_name FROM fc_payments p 
                  LEFT JOIN fc_players pl ON p.player_id = pl.id 
                  WHERE p.deleted_at IS NULL 
                  ORDER BY p.created_at DESC
                  LIMIT ?, ?";

        $offset = ($page - 1) * ITEMS_PER_PAGE;
        $payments = $this->db->findAll($query, [$offset, ITEMS_PER_PAGE]);

        $playersList = $this->db->findAll(
            'SELECT id, name FROM fc_players WHERE status = 1 AND deleted_at IS NULL ORDER BY name ASC'
        );

        $this->data['title'] = 'مالی';
        $this->data['payments'] = $payments;
        $this->data['players_list'] = $playersList;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('financial.index', $this->data);
    }

    /**
     * Record payment
     *
     * @return void
     */
    public function record(): void
    {
        RbacMiddleware::requirePermission('record_payment');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Method not allowed'], 405);
            return;
        }

        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $playerId = (int)($this->post('player_id') ?? 0);
        $amount = (float)($this->post('amount') ?? 0);
        $description = SecurityHelper::sanitizeString($this->post('description') ?? '');
        $paymentMethod = SecurityHelper::sanitizeString($this->post('payment_method') ?? '');

        // Validate inputs
        if ($playerId === 0) {
            $this->json(['error' => 'Player is required'], 422);
            return;
        }

        if ($amount <= 0) {
            $this->json(['error' => 'Amount must be greater than zero'], 422);
            return;
        }

        // Record payment
        $paymentId = $this->paymentModel->recordPayment([
            'player_id' => $playerId,
            'amount' => $amount,
            'description' => $description,
            'payment_method' => $paymentMethod,
            'status' => 'completed',
            'reference_number' => 'REF-' . time() . '-' . mt_rand(1000, 9999),
        ]);

        if (!$paymentId) {
            $this->json(['error' => 'Failed to record payment'], 500);
            return;
        }

        $this->json(['success' => true, 'payment_id' => $paymentId]);
    }

    /**
     * Generate receipt
     *
     * @param string $id Payment ID
     * @return void
     */
    public function generateReceipt(string $id): void
    {
        RbacMiddleware::requirePermission('view_payments');

        $paymentId = (int)$id;
        $query = "SELECT p.*, pl.name as player_name, pl.national_id FROM fc_payments p 
                  LEFT JOIN fc_players pl ON p.player_id = pl.id 
                  WHERE p.id = ?";
        $payment = $this->db->findOne($query, [$paymentId]);

        if ($payment === null) {
            $this->json(['error' => 'Payment not found'], 404);
            return;
        }

        // Return HTML receipt
        header('Content-Type: text/html; charset=utf-8');
        echo $this->generateReceiptHtml($payment);
    }

    /**
     * Generate receipt HTML
     *
     * @param array $payment Payment data
     * @return string
     */
    private function generateReceiptHtml(array $payment): string
    {
        $amount = number_format((float)$payment['amount'], 2);
        $date = date(DISPLAY_DATETIME_FORMAT, strtotime($payment['created_at']));
        $playerName = SecurityHelper::escape($payment['player_name'] ?? '-');
        $description = SecurityHelper::escape($payment['description'] ?? '-');
        $reference = SecurityHelper::escape($payment['reference_number']);

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Receipt #$reference</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h2 { margin: 0; }
                .details { margin: 20px 0; }
                .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .row label { font-weight: bold; }
                .total { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin: 20px 0; padding: 10px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>Payment Receipt</h2>
                    <p>Reference: $reference</p>
                </div>
                <div class="details">
                    <div class="row">
                        <label>Player Name:</label>
                        <span>$playerName</span>
                    </div>
                    <div class="row">
                        <label>Amount:</label>
                        <span>$amount</span>
                    </div>
                    <div class="row">
                        <label>Description:</label>
                        <span>$description</span>
                    </div>
                    <div class="row">
                        <label>Payment Date:</label>
                        <span>$date</span>
                    </div>
                    <div class="row">
                        <label>Status:</label>
                        <span>Completed</span>
                    </div>
                </div>
                <div class="footer">
                    <p>Thank you for your payment!</p>
                </div>
            </div>
        </body>
        </html>
        HTML;
    }

    /**
     * Financial report
     *
     * @return void
     */
    public function report(): void
    {
        RbacMiddleware::requirePermission('generate_reports');

        $year = (int)($this->get('year') ?? date('Y'));
        $yearlyRevenue = $this->paymentModel->getYearlyRevenue($year);

        $this->data['title'] = 'Financial Report';
        $this->data['year'] = $year;
        $this->data['yearly_revenue'] = $yearlyRevenue;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('financial.report', $this->data);
    }

    /**
     * Debts report
     *
     * @return void
     */
    public function debtReport(): void
    {
        RbacMiddleware::requirePermission('view_debts');

        $debts = $this->paymentModel->getDebtsReport();

        $this->data['title'] = 'Outstanding Debts';
        $this->data['debts'] = $debts;
        $this->data['total_outstanding'] = array_reduce(
            $debts,
            fn ($sum, $item) => $sum + ($item['total_outstanding'] ?? 0),
            0
        );

        $this->render('financial.debts', $this->data);
    }
}
