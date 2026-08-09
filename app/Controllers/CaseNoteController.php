<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CaseNote;
use App\Models\Player;
use App\Models\User;
use App\Middleware\AuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Case Note Controller
 * Handles case notes for students (admin can send achievements/concerns)
 */
class CaseNoteController extends Controller
{
    private CaseNote $caseNoteModel;
    private Player $playerModel;
    private User $userModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->caseNoteModel = new CaseNote();
        $this->playerModel = new Player();
        $this->userModel = new User();
    }

    /**
     * List case notes for a player (admin view)
     *
     * @return void
     */
    public function index(): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        $playerId = $this->get('player_id') ? (int)$this->get('player_id') : null;
        
        if ($playerId) {
            $caseNotes = $this->caseNoteModel->getByPlayerId($playerId, false);
            $player = $this->playerModel->find($playerId);
        } else {
            // Get recent case notes
            $caseNotes = $this->caseNoteModel->getHighSeverityNotes();
            $player = null;
        }
        
        $allPlayers = $this->playerModel->getActive();
        
        $this->data['title'] = 'مدیریت پرونده‌ها';
        $this->data['case_notes'] = $caseNotes;
        $this->data['players'] = $allPlayers;
        $this->data['selected_player'] = $player;
        $this->data['csrf_token'] = $this->generateCsrf();
        $this->data['note_types'] = [
            'general' => 'عمومی',
            'medical' => 'پزشکی',
            'disciplinary' => 'انظباطی',
            'achievement' => 'دستاورد',
            'concern' => 'نگرانی',
        ];
        $this->data['severities'] = [
            'low' => 'کم',
            'medium' => 'متوسط',
            'high' => 'بالا',
        ];
        
        $this->render('case_notes.index', $this->data);
    }

    /**
     * Show create case note form
     *
     * @return void
     */
    public function create(): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        $players = $this->playerModel->getActive();
        
        $this->data['title'] = 'افزودن یادداشت پرونده';
        $this->data['players'] = $players;
        $this->data['note_types'] = [
            'general' => 'عمومی',
            'medical' => 'پزشکی',
            'disciplinary' => 'انظباطی',
            'achievement' => 'دستاورد',
            'concern' => 'نگرانی',
        ];
        $this->data['severities'] = [
            'low' => 'کم',
            'medium' => 'متوسط',
            'high' => 'بالا',
        ];
        $this->data['csrf_token'] = $this->generateCsrf();
        
        $this->render('case_notes.form', $this->data);
    }

    /**
     * Store new case note
     *
     * @return void
     */
    public function store(): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }
        
        $adminId = $this->getUserId();
        
        $playerId = (int)($this->post('player_id') ?? 0);
        $title = SecurityHelper::sanitizeString($this->post('title') ?? '');
        $content = SecurityHelper::sanitizeString($this->post('content') ?? '');
        $noteType = $this->post('note_type') ?? 'general';
        $severity = $this->post('severity') ?? 'low';
        $isVisible = (bool)($this->post('is_visible_to_player') ?? false);
        
        // Validate
        if (!$playerId) {
            $this->json(['error' => 'Player is required'], 422);
            return;
        }
        
        if (empty($title)) {
            $this->json(['error' => 'Title is required'], 422);
            return;
        }
        
        if (empty($content)) {
            $this->json(['error' => 'Content is required'], 422);
            return;
        }
        
        $player = $this->playerModel->find($playerId);
        if ($player === null) {
            $this->json(['error' => 'Player not found'], 404);
            return;
        }
        
        // Get user_id for this player
        $user = $this->userModel->findBy('player_id', (string)$playerId);
        $userId = $user['id'] ?? null;
        
        $caseNoteData = [
            'player_id' => $playerId,
            'user_id' => $userId,
            'note_type' => $noteType,
            'title' => $title,
            'content' => $content,
            'severity' => $severity,
            'created_by' => $adminId,
            'is_visible_to_player' => $isVisible ? 1 : 0,
        ];
        
        $caseNoteId = $this->caseNoteModel->createCaseNote($caseNoteData);
        
        if (!$caseNoteId) {
            $this->json(['error' => 'Failed to create case note'], 500);
            return;
        }
        
        $this->json([
            'success' => true,
            'message' => 'Case note created successfully',
            'redirect' => APP_URL . '/case-notes?player_id=' . $playerId,
        ]);
    }

    /**
     * Show edit case note form
     *
     * @param string $id
     * @return void
     */
    public function edit(string $id): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        $caseNoteId = (int)$id;
        $caseNote = $this->caseNoteModel->getCaseNote($caseNoteId);
        
        if ($caseNote === null) {
            $this->redirect('/case-notes');
        }
        
        $players = $this->playerModel->getActive();
        
        $this->data['title'] = 'ویرایش یادداشت پرونده';
        $this->data['case_note'] = $caseNote;
        $this->data['players'] = $players;
        $this->data['note_types'] = [
            'general' => 'عمومی',
            'medical' => 'پزشکی',
            'disciplinary' => 'انظباطی',
            'achievement' => 'دستاورد',
            'concern' => 'نگرانی',
        ];
        $this->data['severities'] = [
            'low' => 'کم',
            'medium' => 'متوسط',
            'high' => 'بالا',
        ];
        $this->data['csrf_token'] = $this->generateCsrf();
        
        $this->render('case_notes.form', $this->data);
    }

    /**
     * Update case note
     *
     * @param string $id
     * @return void
     */
    public function update(string $id): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }
        
        $caseNoteId = (int)$id;
        $caseNote = $this->caseNoteModel->getCaseNote($caseNoteId);
        
        if ($caseNote === null) {
            $this->json(['error' => 'Case note not found'], 404);
            return;
        }
        
        $adminId = $this->getUserId();
        
        $playerId = (int)($this->post('player_id') ?? $caseNote['player_id']);
        $title = SecurityHelper::sanitizeString($this->post('title') ?? '');
        $content = SecurityHelper::sanitizeString($this->post('content') ?? '');
        $noteType = $this->post('note_type') ?? $caseNote['note_type'];
        $severity = $this->post('severity') ?? $caseNote['severity'];
        $isVisible = (bool)($this->post('is_visible_to_player') ?? $caseNote['is_visible_to_player']);
        
        // Validate
        if (!$playerId) {
            $this->json(['error' => 'Player is required'], 422);
            return;
        }
        
        if (empty($title)) {
            $this->json(['error' => 'Title is required'], 422);
            return;
        }
        
        if (empty($content)) {
            $this->json(['error' => 'Content is required'], 422);
            return;
        }
        
        $player = $this->playerModel->find($playerId);
        if ($player === null) {
            $this->json(['error' => 'Player not found'], 404);
            return;
        }
        
        // Get user_id for this player
        $user = $this->userModel->findBy('player_id', (string)$playerId);
        $userId = $user['id'] ?? null;
        
        $caseNoteData = [
            'player_id' => $playerId,
            'user_id' => $userId,
            'note_type' => $noteType,
            'title' => $title,
            'content' => $content,
            'severity' => $severity,
            'is_visible_to_player' => $isVisible ? 1 : 0,
        ];
        
        if (!$this->caseNoteModel->update($caseNoteId, $caseNoteData)) {
            $this->json(['error' => 'Failed to update case note'], 500);
            return;
        }
        
        $this->json([
            'success' => true,
            'message' => 'Case note updated successfully',
            'redirect' => APP_URL . '/case-notes?player_id=' . $playerId,
        ]);
    }

    /**
     * Delete case note
     *
     * @param string $id
     * @return void
     */
    public function delete(string $id): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }
        
        $caseNoteId = (int)$id;
        
        if (!$this->caseNoteModel->deleteCaseNote($caseNoteId)) {
            $this->json(['error' => 'Failed to delete case note'], 500);
            return;
        }
        
        $this->json(['success' => true, 'message' => 'Case note deleted']);
    }

    /**
     * Toggle visibility to player
     *
     * @param string $id
     * @return void
     */
    public function toggleVisibility(string $id): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        $caseNoteId = (int)$id;
        $caseNote = $this->caseNoteModel->getCaseNote($caseNoteId);
        
        if ($caseNote === null) {
            $this->json(['error' => 'Case note not found'], 404);
            return;
        }
        
        $newVisibility = !$caseNote['is_visible_to_player'];
        
        if (!$this->caseNoteModel->updateVisibility($caseNoteId, $newVisibility)) {
            $this->json(['error' => 'Failed to update visibility'], 500);
            return;
        }
        
        $this->json([
            'success' => true,
            'is_visible_to_player' => $newVisibility,
        ]);
    }
}
