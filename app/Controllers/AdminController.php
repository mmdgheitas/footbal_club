<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\User;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Admin Controller
 * PSR-12 compliant - System administration
 */
class AdminController extends Controller
{
    private User $userModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->userModel = new User();
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

        $this->data['title'] = 'Settings';
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

        // Get all POST data and update settings
        $settings = $this->post();
        unset($settings['_csrf_token']);

        foreach ($settings as $key => $value) {
            $settingKey = SecurityHelper::sanitizeString($key);
            $settingValue = SecurityHelper::sanitizeString($value);

            $query = "INSERT INTO fc_settings (setting_key, setting_value) 
                      VALUES (?, ?) 
                      ON DUPLICATE KEY UPDATE setting_value = ?";

            $this->db->execute($query, [$settingKey, $settingValue, $settingValue]);
        }

        $this->json(['success' => true, 'message' => 'Settings updated successfully']);
    }
}
