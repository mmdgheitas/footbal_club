<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\SmsLog;
use App\Models\Player;
use App\Models\Guardian;
use App\Models\Setting;
use App\Helpers\SmsProvider;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * SMS Controller
 * PSR-12 compliant - Handles SMS communications
 */
class SmsController extends Controller
{
    private SmsLog $smsLogModel;
    private Player $playerModel;
    private Guardian $guardianModel;
    private ?SmsProvider $smsProvider = null;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->smsLogModel = new SmsLog();
        $this->playerModel = new Player();
        $this->guardianModel = new Guardian();

        // Initialize SMS provider
        $this->initializeSmsProvider();
    }

    /**
     * Initialize SMS provider
     *
     * @return void
     */
    private function initializeSmsProvider(): void
    {
        require_once dirname(__DIR__) . '/Helpers/SmsProvider.php';

        $provider = SMS_PROVIDER;
        try {
            $settingModel = new Setting();
            $stored = $settingModel->get('sms_provider');
            if ($stored !== null && $stored !== '') {
                $provider = $stored;
            }
        } catch (\Throwable) {
            // Fall back to config when settings table is unavailable
        }

        if ($provider === 'log') {
            $provider = 'mock';
        }

        if ($provider === 'twilio') {
            $this->smsProvider = new \App\Helpers\TwilioSmsProvider(
                SMS_API_KEY,
                SMS_API_SECRET,
                SMS_FROM_NUMBER
            );
        } elseif ($provider === 'nexmo') {
            $this->smsProvider = new \App\Helpers\NexmoSmsProvider(
                SMS_API_KEY,
                SMS_API_SECRET,
                SMS_FROM_NUMBER
            );
        } else {
            // Use mock provider in development
            $this->smsProvider = new \App\Helpers\MockSmsProvider(
                SMS_API_KEY,
                SMS_API_SECRET,
                SMS_FROM_NUMBER
            );
        }
    }

    /**
     * Show SMS send form
     *
     * @return void
     */
    public function index(): void
    {
        RbacMiddleware::requirePermission('send_sms');

        $players = $this->playerModel->getActive();

        $this->data['title'] = 'ارسال پیامک';
        $this->data['players'] = $players;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('sms.index', $this->data);
    }

    /**
     * Send SMS message
     *
     * @return void
     */
    public function send(): void
    {
        RbacMiddleware::requirePermission('send_sms');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Method not allowed'], 405);
            return;
        }

        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $recipients = $this->post('recipients') ?? [];
        if (!is_array($recipients)) {
            $recipients = $recipients !== '' && $recipients !== null ? [(string)$recipients] : [];
        }
        $message = trim(strip_tags((string)($this->post('message') ?? '')));
        $smsType = SecurityHelper::sanitizeString($this->post('sms_type') ?? 'general');

        if (empty($recipients) || !is_array($recipients)) {
            $this->json(['error' => 'Please select at least one recipient'], 422);
            return;
        }

        if (empty($message)) {
            $this->json(['error' => 'Message cannot be empty'], 422);
            return;
        }

        if (strlen($message) > 160) {
            $this->json(['error' => 'Message exceeds 160 characters'], 422);
            return;
        }

        $sentCount = 0;
        $failedCount = 0;
        $skippedNoPhone = 0;

        foreach ($recipients as $recipient) {
            $playerId = (int)$recipient;
            $player = $this->playerModel->find($playerId);

            if ($player === null) {
                $failedCount++;
                continue;
            }

            $guardians = $this->guardianModel->getByPlayerId($playerId);
            $hasPhone = false;

            foreach ($guardians as $guardian) {
                if (empty($guardian['phone'])) {
                    continue;
                }

                $hasPhone = true;
                $result = $this->smsProvider->send($guardian['phone'], $message);

                if ($result['success']) {
                    $this->smsLogModel->logSms([
                        'player_id' => $playerId,
                        'recipient_phone' => $guardian['phone'],
                        'message' => $message,
                        'sms_type' => $smsType,
                        'provider' => SMS_PROVIDER,
                        'provider_message_id' => $result['message_id'],
                        'status' => 'sent',
                    ]);
                    $sentCount++;
                } else {
                    $this->smsLogModel->logSms([
                        'player_id' => $playerId,
                        'recipient_phone' => $guardian['phone'],
                        'message' => $message,
                        'sms_type' => $smsType,
                        'provider' => SMS_PROVIDER,
                        'status' => 'failed',
                        'error_message' => $result['error'],
                    ]);
                    $failedCount++;
                }
            }

            if (!$hasPhone) {
                $skippedNoPhone++;
            }
        }

        if ($sentCount === 0 && $failedCount === 0) {
            $this->json([
                'error' => $skippedNoPhone > 0
                    ? 'برای بازیکنان انتخاب‌شده شماره ولی ثبت نشده است.'
                    : 'هیچ گیرنده‌ای انتخاب نشده است.',
            ], 422);
            return;
        }

        $this->json([
            'success' => true,
            'sent_count' => $sentCount,
            'failed_count' => $failedCount,
            'message' => "ارسال موفق: {$sentCount} — ناموفق: {$failedCount}",
        ]);
    }

    /**
     * View SMS logs
     *
     * @return void
     */
    public function logs(): void
    {
        RbacMiddleware::requirePermission('send_sms');

        $page = (int)($this->get('page') ?? 1);
        $filter = SecurityHelper::sanitizeString($this->get('filter') ?? 'all');

        $query = "SELECT * FROM fc_sms_logs WHERE 1=1";
        $params = [];

        if ($filter === 'pending') {
            $query .= " AND status = 'pending'";
        } elseif ($filter === 'failed') {
            $query .= " AND status = 'failed'";
        } elseif ($filter === 'sent') {
            $query .= " AND status IN ('sent', 'delivered')";
        }

        $query .= " ORDER BY created_at DESC LIMIT ?, ?";

        $offset = ($page - 1) * ITEMS_PER_PAGE;
        $params[] = $offset;
        $params[] = ITEMS_PER_PAGE;

        $logs = $this->db->findAll($query, $params);

        $this->data['title'] = 'گزارش پیامک‌ها';
        $this->data['logs'] = $logs;
        $this->data['filter'] = $filter;

        $this->render('sms.logs', $this->data);
    }
}
