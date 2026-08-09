<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Achievement;
use App\Models\Player;
use App\Models\User;
use App\Middleware\AuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Achievement Controller
 * Handles admin sending achievements to students
 */
class AchievementController extends Controller
{
    private Achievement $achievementModel;
    private Player $playerModel;
    private User $userModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->achievementModel = new Achievement();
        $this->playerModel = new Player();
        $this->userModel = new User();
    }

    /**
     * List achievements for a player (player view)
     *
     * @return void
     */
    public function index(): void
    {
        AuthMiddleware::requireAuth();
        
        $userId = $this->getUserId();
        $user = AuthMiddleware::getUser();
        
        if ($user === null) {
            $this->redirect('/403');
        }
        
        if ($user['role'] === 'player') {
            // Player view - show their own achievements
            $playerId = $user['player_id'] ?? null;
            if (!$playerId) {
                $this->redirect('/player-panel');
            }
            
            $achievements = $this->achievementModel->getByPlayerId($playerId, true);
            $stats = $this->achievementModel->getPlayerStats($playerId);
            
            $this->data['title'] = 'دستیافت‌ها';
            $this->data['achievements'] = $achievements;
            $this->data['stats'] = $stats;
            $this->data['is_admin'] = false;
        } else {
            // Admin view - show all achievements or filter by player
            RbacMiddleware::requirePermission('manage_players');
            
            $playerId = $this->get('player_id') ? (int)$this->get('player_id') : null;
            
            if ($playerId) {
                $achievements = $this->achievementModel->getByPlayerId($playerId, false);
                $player = $this->playerModel->find($playerId);
            } else {
                $achievements = $this->achievementModel->getRecent(50);
                $player = null;
            }
            
            $allPlayers = $this->playerModel->getActive();
            
            $this->data['title'] = 'مدیریت دستاوردها';
            $this->data['achievements'] = $achievements;
            $this->data['players'] = $allPlayers;
            $this->data['selected_player'] = $player;
            $this->data['is_admin'] = true;
            $this->data['csrf_token'] = $this->generateCsrf();
        }
        
        $this->render('achievements.index', $this->data);
    }

    /**
     * Show create achievement form
     *
     * @return void
     */
    public function create(): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        $players = $this->playerModel->getActive();
        
        $this->data['title'] = 'افزودن دستاورد';
        $this->data['players'] = $players;
        $this->data['achievement_types'] = [
            'skill' => 'مهارت',
            'attendance' => 'حضور',
            'sportsmanship' => 'روحیه ورزشی',
            'improvement' => 'پیشرفت',
            'teamwork' => 'کاری تیمی',
            'leadership' => 'رهبری',
            'other' => 'دیگر',
        ];
        $this->data['csrf_token'] = $this->generateCsrf();
        
        $this->render('achievements.form', $this->data);
    }

    /**
     * Store new achievement
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
        $description = SecurityHelper::sanitizeString($this->post('description') ?? '');
        $achievementType = $this->post('achievement_type') ?? 'skill';
        $points = (int)($this->post('points') ?? 0);
        $dateAchieved = $this->post('date_achieved') ?? date('Y-m-d');
        $isPublished = (bool)($this->post('is_published') ?? true);
        
        // Validate
        if (!$playerId) {
            $this->json(['error' => 'Player is required'], 422);
            return;
        }
        
        if (empty($title)) {
            $this->json(['error' => 'Title is required'], 422);
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
        
        $achievementData = [
            'player_id' => $playerId,
            'user_id' => $userId,
            'title' => $title,
            'description' => $description,
            'achievement_type' => $achievementType,
            'points' => $points,
            'date_achieved' => $dateAchieved,
            'created_by' => $adminId,
            'is_published' => $isPublished ? 1 : 0,
        ];
        
        $achievementId = $this->achievementModel->createAchievement($achievementData);
        
        if (!$achievementId) {
            $this->json(['error' => 'Failed to create achievement'], 500);
            return;
        }
        
        $this->json([
            'success' => true,
            'message' => 'Achievement created successfully',
            'redirect' => APP_URL . '/achievements',
        ]);
    }

    /**
     * Show edit achievement form
     *
     * @param string $id
     * @return void
     */
    public function edit(string $id): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        $achievementId = (int)$id;
        $achievement = $this->achievementModel->getAchievement($achievementId);
        
        if ($achievement === null) {
            $this->redirect('/achievements');
        }
        
        $players = $this->playerModel->getActive();
        
        $this->data['title'] = 'ویرایش دستاورد';
        $this->data['achievement'] = $achievement;
        $this->data['players'] = $players;
        $this->data['achievement_types'] = [
            'skill' => 'مهارت',
            'attendance' => 'حضور',
            'sportsmanship' => 'روحیه ورزشی',
            'improvement' => 'پیشرفت',
            'teamwork' => 'کاری تیمی',
            'leadership' => 'رهبری',
            'other' => 'دیگر',
        ];
        $this->data['csrf_token'] = $this->generateCsrf();
        
        $this->render('achievements.form', $this->data);
    }

    /**
     * Update achievement
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
        
        $achievementId = (int)$id;
        $achievement = $this->achievementModel->getAchievement($achievementId);
        
        if ($achievement === null) {
            $this->json(['error' => 'Achievement not found'], 404);
            return;
        }
        
        $adminId = $this->getUserId();
        
        $playerId = (int)($this->post('player_id') ?? $achievement['player_id']);
        $title = SecurityHelper::sanitizeString($this->post('title') ?? '');
        $description = SecurityHelper::sanitizeString($this->post('description') ?? '');
        $achievementType = $this->post('achievement_type') ?? $achievement['achievement_type'];
        $points = (int)($this->post('points') ?? $achievement['points']);
        $dateAchieved = $this->post('date_achieved') ?? $achievement['date_achieved'];
        $isPublished = (bool)($this->post('is_published') ?? $achievement['is_published']);
        
        // Validate
        if (!$playerId) {
            $this->json(['error' => 'Player is required'], 422);
            return;
        }
        
        if (empty($title)) {
            $this->json(['error' => 'Title is required'], 422);
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
        
        $achievementData = [
            'player_id' => $playerId,
            'user_id' => $userId,
            'title' => $title,
            'description' => $description,
            'achievement_type' => $achievementType,
            'points' => $points,
            'date_achieved' => $dateAchieved,
            'is_published' => $isPublished ? 1 : 0,
        ];
        
        if (!$this->achievementModel->update($achievementId, $achievementData)) {
            $this->json(['error' => 'Failed to update achievement'], 500);
            return;
        }
        
        $this->json([
            'success' => true,
            'message' => 'Achievement updated successfully',
            'redirect' => APP_URL . '/achievements',
        ]);
    }

    /**
     * Delete achievement
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
        
        $achievementId = (int)$id;
        
        if (!$this->achievementModel->deleteAchievement($achievementId)) {
            $this->json(['error' => 'Failed to delete achievement'], 500);
            return;
        }
        
        $this->json(['success' => true, 'message' => 'Achievement deleted']);
    }

    /**
     * Toggle publish status
     *
     * @param string $id
     * @return void
     */
    public function togglePublish(string $id): void
    {
        RbacMiddleware::requirePermission('manage_players');
        
        $achievementId = (int)$id;
        $achievement = $this->achievementModel->getAchievement($achievementId);
        
        if ($achievement === null) {
            $this->json(['error' => 'Achievement not found'], 404);
            return;
        }
        
        $newStatus = !$achievement['is_published'];
        
        if (!$this->achievementModel->togglePublish($achievementId, $newStatus)) {
            $this->json(['error' => 'Failed to update publish status'], 500);
            return;
        }
        
        $this->json([
            'success' => true,
            'is_published' => $newStatus,
        ]);
    }
}
