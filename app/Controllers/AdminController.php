<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\User;
use App\Models\Setting;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Admin Controller
 * PSR-12 compliant - System administration
 */
class AdminController extends Controller
{
    private User $userModel;
    private Setting $settingModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->userModel = new User();
        $this->settingModel = new Setting();
    }

    /**
     * List users
     *
     * @return void
     */
    public function users(): void
    {
        RbacMiddleware::requireRole('super_admin');

        $page = (int)($this->get('page') ?? 1);
        $role = SecurityHelper::sanitizeString($this->get('role') ?? '');

        $query = "SELECT * FROM fc_users WHERE deleted_at IS NULL";
        $params = [];

        if (!empty($role)) {
            $query .= " AND role = ?";
            $params[] = $role;
        }

        $query .= " ORDER BY created_at DESC LIMIT ?, ?";

        $offset = ($page - 1) * ITEMS_PER_PAGE;
        $params[] = $offset;
        $params[] = ITEMS_PER_PAGE;

        $users = $this->db->findAll($query, $params);

        $this->data['title'] = 'Users';
        $this->data['users'] = $users;
        $this->data['roles'] = ROLES;
        $this->data['selected_role'] = $role;

        $this->render('admin.users', $this->data);
    }

    /**
     * Settings page
     *
     * @return void
     */
    public function settings(): void
    {
        RbacMiddleware::requireRole('super_admin');

        $stored = $this->settingModel->getAllKeyed();

        $this->data['title'] = 'تنظیمات';
        $this->data['settings'] = $stored;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('admin.settings', $this->data);
    }

    /**
     * Update settings
     *
     * @return void
     */
    public function updateSettings(): void
    {
        RbacMiddleware::requireRole('super_admin');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Method not allowed'], 405);
            return;
        }

        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $allowedKeys = [
            'app_name',
            'attendance_warning_threshold',
            'max_upload_size',
            'sms_provider',
        ];

        $toSave = [];
        foreach ($allowedKeys as $key) {
            $value = $this->post($key);
            if ($value === null || is_array($value)) {
                continue;
            }
            $toSave[$key] = trim(strip_tags((string)$value));
        }

        if (isset($toSave['sms_provider']) && $toSave['sms_provider'] === 'log') {
            $toSave['sms_provider'] = 'mock';
        }

        if (isset($toSave['attendance_warning_threshold'])) {
            $threshold = (int)$toSave['attendance_warning_threshold'];
            $toSave['attendance_warning_threshold'] = (string)max(0, min(100, $threshold));
        }

        if (isset($toSave['max_upload_size'])) {
            $toSave['max_upload_size'] = (string)max(1024, (int)$toSave['max_upload_size']);
        }

        if (empty($toSave)) {
            $this->json(['error' => 'No settings to save'], 422);
            return;
        }

        try {
            $this->settingModel->setMany($toSave);
        } catch (\Throwable) {
            $this->json(['error' => 'Failed to save settings'], 500);
            return;
        }

        $this->json(['success' => true, 'message' => 'تنظیمات با موفقیت ذخیره شد.']);
    }
}
