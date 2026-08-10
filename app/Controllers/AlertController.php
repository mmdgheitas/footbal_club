<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Alert;
use App\Models\Classroom;
use App\Models\Player;
use App\Middleware\AuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Alert Controller
 * Handles admin alert publishing with targeting by class, age range, or individual player
 */
class AlertController extends Controller
{
    private Alert $alertModel;
    private Classroom $classroomModel;
    private Player $playerModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        
        $this->alertModel = new Alert();
        $this->classroomModel = new Classroom();
        $this->playerModel = new Player();
    }

    /**
     * Display alerts list and create form
     *
     * @return void
     */
    public function index(): void
    {
        RbacMiddleware::requirePermission('manage_alerts');
        
        $classrooms = $this->classroomModel->all();
        $players = $this->playerModel->getActive();
        
        $this->data['title'] = 'مدیریت اعلانات';
        $this->data['alerts'] = $this->alertModel->getActiveAlerts();
        $this->data['csrf_token'] = $this->generateCsrf();
        $this->data['age_categories'] = AGE_CATEGORIES;
        $this->data['classrooms'] = $classrooms;
        $this->data['players'] = $players;
        $this->data['player_positions'] = PLAYER_POSITIONS;
        $this->data['priorities'] = [
            'low' => 'کم',
            'medium' => 'متوسط',
            'high' => 'بالا',
            'urgent' => 'فوری',
        ];

        $this->render('alerts.index', $this->data);
    }

    /**
     * Create new alert with targeting options
     *
     * @return void
     */
    public function create(): void
    {
        RbacMiddleware::requirePermission('manage_alerts');
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('/admin/alerts');
        }

        if (!$this->validateCsrf()) {
            $this->flash('error', 'توکن امنیتی نامعتبر است.');
            $this->redirect('/admin/alerts');
        }

        $title = SecurityHelper::sanitizeString($this->post('title') ?? '');
        $message = SecurityHelper::sanitizeString($this->post('message') ?? '');
        $targetType = SecurityHelper::sanitizeString($this->post('target_type') ?? 'all');
        $targetId = $this->post('target_id') ? (int)$this->post('target_id') : null;
        $targetAgeMin = $this->post('target_age_min') ? (int)$this->post('target_age_min') : null;
        $targetAgeMax = $this->post('target_age_max') ? (int)$this->post('target_age_max') : null;
        $priority = SecurityHelper::sanitizeString($this->post('priority') ?? 'medium');
        $expiresAt = $this->post('expires_at') ?? null;

        $errors = [];
        if (empty($title)) {
            $errors[] = 'عنوان اعلان الزامی است.';
        }
        if (empty($message)) {
            $errors[] = 'متن اعلان الزامی است.';
        }
        
        // Validate target type specific fields
        if ($targetType === 'class' && !$targetId) {
            $errors[] = 'لطفاً یک کلاس انتخاب کنید.';
        }
        if ($targetType === 'age_range') {
            if (!$targetAgeMin || !$targetAgeMax) {
                $errors[] = 'لطفاً محدوده سنی را مشخص کنید.';
            }
            if ($targetAgeMin && $targetAgeMax && $targetAgeMin > $targetAgeMax) {
                $errors[] = 'سن حداقل باید کمتر از سن حداکثر باشد.';
            }
        }
        if ($targetType === 'player' && !$targetId) {
            $errors[] = 'لطفاً یک بازیکن انتخاب کنید.';
        }

        if (!empty($errors)) {
            foreach ($errors as $error) {
                $this->flash('error', $error);
            }
            $this->redirect('/admin/alerts');
        }

        // Format expires_at
        if ($expiresAt) {
            $expiresAt = date('Y-m-d H:i:s', strtotime($expiresAt));
        }

        $alertData = [
            'title' => $title,
            'message' => $message,
            'target_audience' => $targetType,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'target_age_min' => $targetAgeMin,
            'target_age_max' => $targetAgeMax,
            'created_by' => $this->getUserId(),
            'priority' => $priority,
            'expires_at' => $expiresAt,
        ];

        $result = $this->alertModel->createAlert($alertData);

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
        RbacMiddleware::requirePermission('manage_alerts');
        
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

    /**
     * Get alerts for the current player
     *
     * @return void
     */
    public function myAlerts(): void
    {
        AuthMiddleware::requireAuth();
        
        $userId = $this->getUserId();
        $user = AuthMiddleware::getUser();
        
        if ($user === null || $user['role'] !== 'player') {
            $this->redirect('/403');
        }
        
        $playerId = $user['player_id'] ?? null;
        if (!$playerId) {
            $this->redirect('/player-panel');
        }
        
        $player = $this->playerModel->find($playerId);
        if ($player === null) {
            $this->redirect('/player-panel');
        }
        
        $ageCategory = $player['age_category'] ?? 'senior';
        $alerts = $this->alertModel->getAlertsForPlayer($ageCategory);
        
        $this->data['title'] = 'اعلانات من';
        $this->data['alerts'] = $alerts;
        
        $this->render('alerts.my_alerts', $this->data);
    }
}
