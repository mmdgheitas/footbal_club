<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Classroom;
use App\Models\Player;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Classroom Controller
 * PSR-12 compliant - Handles classroom management and rosters
 */
class ClassroomController extends Controller
{
    private Classroom $classroomModel;
    private Player $playerModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->classroomModel = new Classroom();
        $this->playerModel = new Player();
    }

    /**
     * Enforce role restrictions for classroom management
     */
    protected function checkAuth(): void
    {
        parent::checkAuth();
        
        // Only super_admin and coach are allowed to access classrooms
        $role = $this->getUserRole();
        if ($role !== 'super_admin' && $role !== 'coach') {
            $this->redirect('/403');
        }
    }

    /**
     * List classrooms
     */
    public function index(): void
    {
        $classrooms = $this->classroomModel->all();
        
        // Fetch player count for each classroom
        foreach ($classrooms as &$classroom) {
            $classroom['player_count'] = $this->playerModel->count("classroom_id = " . (int)$classroom['id'] . " AND deleted_at IS NULL");
        }
        unset($classroom);

        $this->data['title'] = 'کلاس‌ها (تیم‌ها)';
        $this->data['classrooms'] = $classrooms;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('classrooms.index', $this->data);
    }

    /**
     * Create classroom view
     */
    public function create(): void
    {
        $this->data['title'] = 'کلاس جدید';
        $this->data['classroom'] = null;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('classrooms.form', $this->data);
    }

    /**
     * Store new classroom
     */
    public function store(): void
    {
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $name = SecurityHelper::sanitizeString($this->post('name') ?? '');
        $description = SecurityHelper::sanitizeString($this->post('description') ?? '');

        if (empty($name)) {
            $this->json(['error' => 'نام کلاس الزامی است'], 422);
            return;
        }

        // Check uniqueness
        if ($this->classroomModel->findBy('name', $name) !== null) {
            $this->json(['error' => 'کلاسی با این نام از قبل وجود دارد'], 422);
            return;
        }

        $classroomId = $this->classroomModel->createClassroom([
            'name' => $name,
            'description' => $description,
        ]);

        if (!$classroomId) {
            $this->json(['error' => 'خطا در ثبت کلاس'], 500);
            return;
        }

        $this->json([
            'success' => true,
            'message' => 'کلاس با موفقیت ایجاد شد',
            'redirect' => APP_URL . '/classrooms',
        ]);
    }

    /**
     * Edit classroom view
     */
    public function edit(string $id): void
    {
        $classroomId = (int)$id;
        $classroom = $this->classroomModel->find($classroomId);

        if ($classroom === null) {
            $this->redirect('/classrooms');
        }

        $this->data['title'] = 'ویرایش کلاس';
        $this->data['classroom'] = $classroom;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('classrooms.form', $this->data);
    }

    /**
     * Update classroom
     */
    public function update(string $id): void
    {
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $classroomId = (int)$id;
        $classroom = $this->classroomModel->find($classroomId);

        if ($classroom === null) {
            $this->json(['error' => 'Classroom not found'], 404);
            return;
        }

        $name = SecurityHelper::sanitizeString($this->post('name') ?? '');
        $description = SecurityHelper::sanitizeString($this->post('description') ?? '');

        if (empty($name)) {
            $this->json(['error' => 'نام کلاس الزامی است'], 422);
            return;
        }

        // Check duplicate name for other classroom
        $existing = $this->classroomModel->findBy('name', $name);
        if ($existing !== null && (int)$existing['id'] !== $classroomId) {
            $this->json(['error' => 'کلاسی با این نام از قبل وجود دارد'], 422);
            return;
        }

        if (!$this->classroomModel->update($classroomId, ['name' => $name, 'description' => $description])) {
            $this->json(['error' => 'خطا در بروزرسانی اطلاعات'], 500);
            return;
        }

        $this->json([
            'success' => true,
            'message' => 'تغییرات با موفقیت ذخیره شد',
            'redirect' => APP_URL . '/classrooms',
        ]);
    }

    /**
     * View classroom roster
     */
    public function view(string $id): void
    {
        $classroomId = (int)$id;
        $classroom = $this->classroomModel->find($classroomId);

        if ($classroom === null) {
            $this->redirect('/classrooms');
        }

        // Get roster
        $roster = $this->classroomModel->getRoster($classroomId);
        
        // Get unassigned/available players to add
        $availablePlayers = $this->classroomModel->getAvailablePlayersForClassroom($classroomId);

        $this->data['title'] = 'کلاس ' . $classroom['name'];
        $this->data['classroom'] = $classroom;
        $this->data['roster'] = $roster;
        $this->data['available_players'] = $availablePlayers;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('classrooms.view', $this->data);
    }

    /**
     * Add player to classroom
     */
    public function addPlayer(string $id): void
    {
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $classroomId = (int)$id;
        $classroom = $this->classroomModel->find($classroomId);

        if ($classroom === null) {
            $this->json(['error' => 'Classroom not found'], 404);
            return;
        }

        $playerId = (int)($this->post('player_id') ?? 0);
        $player = $this->playerModel->find($playerId);

        if ($player === null) {
            $this->json(['error' => 'Player not found'], 404);
            return;
        }

        if (!$this->playerModel->update($playerId, ['classroom_id' => $classroomId])) {
            $this->json(['error' => 'خطا در افزودن بازیکن به کلاس'], 500);
            return;
        }

        $this->json([
            'success' => true,
            'message' => 'بازیکن با موفقیت به کلاس اضافه شد',
            'redirect' => APP_URL . '/classroom/view/' . $classroomId,
        ]);
    }

    /**
     * Remove player from classroom
     */
    public function removePlayer(string $id): void
    {
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $classroomId = (int)$id;
        $classroom = $this->classroomModel->find($classroomId);

        if ($classroom === null) {
            $this->json(['error' => 'Classroom not found'], 404);
            return;
        }

        $playerId = (int)($this->post('player_id') ?? 0);
        $player = $this->playerModel->find($playerId);

        if ($player === null) {
            $this->json(['error' => 'Player not found'], 404);
            return;
        }

        // Set classroom_id to null
        if (!$this->playerModel->update($playerId, ['classroom_id' => null])) {
            $this->json(['error' => 'خطا در حذف بازیکن از کلاس'], 500);
            return;
        }

        $this->json([
            'success' => true,
            'message' => 'بازیکن با موفقیت از کلاس حذف شد',
            'redirect' => APP_URL . '/classroom/view/' . $classroomId,
        ]);
    }

    /**
     * Delete classroom
     */
    public function delete(string $id): void
    {
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $classroomId = (int)$id;
        $classroom = $this->classroomModel->find($classroomId);

        if ($classroom === null) {
            $this->json(['error' => 'Classroom not found'], 404);
            return;
        }

        // Delete (Note: fc_players has foreign key constraint with ON DELETE SET NULL, so players will be updated automatically!)
        if (!$this->classroomModel->delete($classroomId)) {
            $this->json(['error' => 'Failed to delete classroom'], 500);
            return;
        }

        $this->json([
            'success' => true,
            'message' => 'کلاس حذف شد',
            'redirect' => APP_URL . '/classrooms',
        ]);
    }
}
