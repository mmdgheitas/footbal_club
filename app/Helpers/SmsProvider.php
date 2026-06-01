<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * SMS Service Provider Abstract Base Class
 * PSR-12 compliant - Plug-and-play SMS provider interface
 */
abstract class SmsProvider
{
    protected string $apiKey;
    protected string $apiSecret;
    protected string $fromNumber;

    /**
     * Constructor - Initialize SMS provider
     *
     * @param string $apiKey API key
     * @param string $apiSecret API secret
     * @param string $fromNumber From number
     */
    public function __construct(string $apiKey, string $apiSecret, string $fromNumber)
    {
        $this->apiKey = $apiKey;
        $this->apiSecret = $apiSecret;
        $this->fromNumber = $fromNumber;
    }

    /**
     * Send SMS message
     *
     * @param string $toNumber Recipient phone number
     * @param string $message Message text
     * @return array ['success' => bool, 'message_id' => string|null, 'error' => string|null]
     */
    abstract public function send(string $toNumber, string $message): array;

    /**
     * Check SMS delivery status
     *
     * @param string $messageId Message ID from provider
     * @return string Status (pending, sent, delivered, failed)
     */
    abstract public function checkStatus(string $messageId): string;

    /**
     * Validate phone number
     *
     * @param string $phoneNumber Phone number to validate
     * @return bool
     */
    public function validatePhoneNumber(string $phoneNumber): bool
    {
        // Basic phone number validation (E.164 format)
        return preg_match('/^\+?[1-9]\d{1,14}$/', preg_replace('/\D/', '', $phoneNumber)) === 1;
    }

    /**
     * Format phone number
     *
     * @param string $phoneNumber Phone number
     * @return string
     */
    public function formatPhoneNumber(string $phoneNumber): string
    {
        // Remove all non-digit characters except +
        $cleaned = preg_replace('/[^\d+]/', '', $phoneNumber);

        // Add + if not present
        if (strpos($cleaned, '+') !== 0) {
            $cleaned = '+' . $cleaned;
        }

        return $cleaned;
    }
}

/**
 * Twilio SMS Provider
 * Implementation for Twilio SMS service
 */
class TwilioSmsProvider extends SmsProvider
{
    private const API_URL = 'https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json';

    /**
     * Send SMS via Twilio
     *
     * @param string $toNumber Recipient phone number
     * @param string $message Message text
     * @return array
     */
    public function send(string $toNumber, string $message): array
    {
        if (!$this->validatePhoneNumber($toNumber)) {
            return [
                'success' => false,
                'message_id' => null,
                'error' => 'Invalid phone number format',
            ];
        }

        $toNumber = $this->formatPhoneNumber($toNumber);

        $url = str_replace('{account_sid}', $this->apiKey, self::API_URL);

        $postData = http_build_query([
            'From' => $this->fromNumber,
            'To' => $toNumber,
            'Body' => $message,
        ]);

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-type: application/x-www-form-urlencoded\r\nAuthorization: Basic ' .
                    base64_encode($this->apiKey . ':' . $this->apiSecret),
                'content' => $postData,
            ],
        ]);

        try {
            $response = file_get_contents($url, false, $context);
            $data = json_decode($response, true);

            if (isset($data['sid'])) {
                return [
                    'success' => true,
                    'message_id' => $data['sid'],
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'message_id' => null,
                'error' => $data['message'] ?? 'Unknown error',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message_id' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Check SMS delivery status
     *
     * @param string $messageId Message SID
     * @return string
     */
    public function checkStatus(string $messageId): string
    {
        $url = str_replace('{account_sid}', $this->apiKey, self::API_URL) . '/' . $messageId . '.json';

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => 'Authorization: Basic ' . base64_encode($this->apiKey . ':' . $this->apiSecret),
            ],
        ]);

        try {
            $response = file_get_contents($url, false, $context);
            $data = json_decode($response, true);

            return $data['status'] ?? 'unknown';
        } catch (\Exception $e) {
            return 'unknown';
        }
    }
}

/**
 * Nexmo SMS Provider
 * Implementation for Nexmo (Vonage) SMS service
 */
class NexmoSmsProvider extends SmsProvider
{
    private const API_URL = 'https://rest.nexmo.com/sms/json';

    /**
     * Send SMS via Nexmo
     *
     * @param string $toNumber Recipient phone number
     * @param string $message Message text
     * @return array
     */
    public function send(string $toNumber, string $message): array
    {
        if (!$this->validatePhoneNumber($toNumber)) {
            return [
                'success' => false,
                'message_id' => null,
                'error' => 'Invalid phone number format',
            ];
        }

        $toNumber = $this->formatPhoneNumber($toNumber);

        $params = [
            'api_key' => $this->apiKey,
            'api_secret' => $this->apiSecret,
            'to' => $toNumber,
            'from' => $this->fromNumber,
            'text' => $message,
        ];

        $url = self::API_URL . '?' . http_build_query($params);

        try {
            $response = file_get_contents($url);
            $data = json_decode($response, true);

            if (isset($data['messages'][0]['status']) && $data['messages'][0]['status'] == 0) {
                return [
                    'success' => true,
                    'message_id' => $data['messages'][0]['message_id'],
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'message_id' => null,
                'error' => $data['messages'][0]['error_text'] ?? 'Unknown error',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message_id' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Check SMS delivery status
     *
     * @param string $messageId Message ID
     * @return string
     */
    public function checkStatus(string $messageId): string
    {
        // Nexmo doesn't provide real-time status check via simple API
        // Would need to use webhook or DLR callbacks
        return 'sent';
    }
}

/**
 * Mock SMS Provider (for development/testing)
 * Implementation that logs SMS without actually sending
 */
class MockSmsProvider extends SmsProvider
{
    private string $logFile;

    /**
     * Constructor
     *
     * @param string $apiKey API key
     * @param string $apiSecret API secret
     * @param string $fromNumber From number
     * @param string $logFile Log file path
     */
    public function __construct(string $apiKey, string $apiSecret, string $fromNumber, string $logFile = '')
    {
        parent::__construct($apiKey, $apiSecret, $fromNumber);
        if ($logFile !== '') {
            $this->logFile = $logFile;
        } elseif (defined('BASE_PATH')) {
            $this->logFile = BASE_PATH . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'logs' . DIRECTORY_SEPARATOR . 'sms_mock.log';
        } else {
            $this->logFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sms_mock.log';
        }
    }

    /**
     * Send SMS (mock)
     *
     * @param string $toNumber Recipient phone number
     * @param string $message Message text
     * @return array
     */
    public function send(string $toNumber, string $message): array
    {
        $messageId = 'MOCK_' . uniqid();

        $logEntry = sprintf(
            "[%s] To: %s | From: %s | Message: %s\n",
            date('Y-m-d H:i:s'),
            $toNumber,
            $this->fromNumber,
            $message
        );

        file_put_contents($this->logFile, $logEntry, FILE_APPEND);

        return [
            'success' => true,
            'message_id' => $messageId,
            'error' => null,
        ];
    }

    /**
     * Check SMS delivery status (mock)
     *
     * @param string $messageId Message ID
     * @return string
     */
    public function checkStatus(string $messageId): string
    {
        return 'delivered';
    }
}
