<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Alert;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Alert Controller
 * PSR-12 compliant - Handles admin/coach alert publishing
 */
class AlertController extends Controller
{
    private Alert $alertModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        
        // Require admin/coach/secretary access
        RbacMiddleware::requireAnyPermission(['send_sms', 'manage_settings']);
        
        $this->alertModel = new Alert();
    }

    /**
     * Display alerts list and create form
     *
     * @return void
     */
    public function index(): void
    {
        $this->data['title'] = 'مدیریت اعلانات';
        $this->data['alerts'] = $this->alertModel->getActiveAlerts();
        $this->data['csrf_token'] = $this->generateCsrf();
        $this->data['age_categories'] = AGE_CATEGORIES;

        $this->render('alerts.index', $this->data);
    }

    /**
     * Create new alert
     *
     * @return void
     */
    public function create(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('/admin/alerts');
        }

        if (!$this->validateCsrf()) {
            $this->flash('error', 'توکن امنیتی نامعتبر است.');
            $this->redirect('/admin/alerts');
        }

        $title = SecurityHelper::sanitizeString($this->post('title') ?? '');
        $message = SecurityHelper::sanitizeString($this->post('message') ?? '');
        $targetAudience = SecurityHelper::sanitizeString($this->post('target_audience') ?? 'all');

        $errors = [];
        if (empty($title)) {
            $errors[] = 'عنوان اعلان الزامی است.';
        }
        if (empty($message)) {
            $errors[] = 'متن اعلان الزامی است.';
        }

        if (!empty($errors)) {
            foreach ($errors as $error) {
                $this->flash('error', $error);
            }
            $this->redirect('/admin/alerts');
        }

        $result = $this->alertModel->createAlert([
            'title' => $title,
            'message' => $message,
            'target_audience' => $targetAudience,
            'created_by' => $this->getUserId(),
        ]);

        if ($result) {
            $this->flash('success', 'اعلان با موفقیت منتشر شد.');
        } else {
            $this->flash('error', 'خطا در ثبت اعلان.');
        }

        $this->redirect('/admin/alerts');
    }

    /**
     * Delete an alert
     *
     * @param string $id Alert ID
     * @return void
     */
    public function delete(string $id): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Method not allowed'], 405);
            return;
        }

        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid security token'], 403);
            return;
        }

        $alertId = (int)$id;
        $result = $this->alertModel->softDelete($alertId);

        if ($result) {
            $this->json(['success' => true]);
        } else {
            $this->json(['error' => 'Failed to delete alert'], 500);
        }
    }
}
