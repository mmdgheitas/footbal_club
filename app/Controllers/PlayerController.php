<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Player;
use App\Models\Medical;
use App\Models\Guardian;
use App\Models\FileUpload;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Player Controller
 * PSR-12 compliant - Handles player CRUD operations
 */
class PlayerController extends Controller
{
    private Player $playerModel;
    private Medical $medicalModel;
    private Guardian $guardianModel;
    private FileUpload $fileUploadModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->playerModel = new Player();
        $this->medicalModel = new Medical();
        $this->guardianModel = new Guardian();
        $this->fileUploadModel = new FileUpload();
    }

    /**
     * List all players
     *
     * @param string $id Player ID (from route)
     * @return void
     */
    public function index(?string $id = null): void
    {
        RbacMiddleware::requirePermission('view_players');

        $page = (int)($this->get('page') ?? 1);
        $search = SecurityHelper::sanitizeString($this->get('search') ?? '');

        $players = [];
        if (!empty($search)) {
            $players = $this->playerModel->search($search);
        } else {
            $paginated = $this->playerModel->paginate($page);
            $players = $paginated['data'];
            $this->data['pagination'] = $paginated;
        }

        $this->data['title'] = 'Players';
        $this->data['players'] = $players;
        $this->data['search'] = $search;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('players.index', $this->data);
    }

    /**
     * Show create player form
     *
     * @return void
     */
    public function create(): void
    {
        RbacMiddleware::requirePermission('manage_players');

        $this->data['title'] = 'Add Player';
        $this->data['positions'] = PLAYER_POSITIONS;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('players.form', $this->data);
    }

    /**
     * Store new player
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

        $data = [
            'name' => SecurityHelper::sanitizeString($this->post('name') ?? ''),
            'date_of_birth' => $this->post('date_of_birth') ?? '',
            'national_id' => SecurityHelper::sanitizeString($this->post('national_id') ?? ''),
            'position' => $this->post('position') ?? '',
            'phone' => SecurityHelper::sanitizeString($this->post('phone') ?? ''),
            'email' => SecurityHelper::sanitizeString($this->post('email') ?? ''),
            'notes' => SecurityHelper::sanitizeString($this->post('notes') ?? ''),
            'medical_clearance' => (bool)$this->post('medical_clearance'),
        ];

        // Validate inputs
        $errors = $this->validatePlayerData($data);

        if (!empty($errors)) {
            $this->json(['errors' => $errors], 422);
            return;
        }

        // Check if national ID already exists
        if ($this->playerModel->findByNationalId($data['national_id']) !== null) {
            $this->json(['error' => 'National ID already exists'], 422);
            return;
        }

        // Create player
        $playerId = $this->playerModel->createPlayer($data);

        if (!$playerId) {
            $this->json(['error' => 'Failed to create player'], 500);
            return;
        }

        // Handle file uploads
        if (!empty($_FILES)) {
            $this->handleFileUploads($playerId);
        }

        $this->json([
            'success' => true,
            'player_id' => $playerId,
            'redirect' => APP_URL . '/player/view/' . $playerId,
        ]);
    }

    /**
     * Show edit player form
     *
     * @param string $id Player ID
     * @return void
     */
    public function edit(string $id): void
    {
        RbacMiddleware::requirePermission('manage_players');

        $playerId = (int)$id;
        $player = $this->playerModel->getWithDetails($playerId);

        if ($player === null) {
            $this->redirect('/players');
        }

        $this->data['title'] = 'Edit Player';
        $this->data['player'] = $player;
        $this->data['positions'] = PLAYER_POSITIONS;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('players.form', $this->data);
    }

    /**
     * Update player
     *
     * @param string $id Player ID
     * @return void
     */
    public function update(string $id): void
    {
        RbacMiddleware::requirePermission('manage_players');

        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $playerId = (int)$id;
        $player = $this->playerModel->find($playerId);

        if ($player === null) {
            $this->json(['error' => 'Player not found'], 404);
            return;
        }

        $data = [
            'name' => SecurityHelper::sanitizeString($this->post('name') ?? ''),
            'date_of_birth' => $this->post('date_of_birth') ?? '',
            'national_id' => SecurityHelper::sanitizeString($this->post('national_id') ?? ''),
            'position' => $this->post('position') ?? '',
            'phone' => SecurityHelper::sanitizeString($this->post('phone') ?? ''),
            'email' => SecurityHelper::sanitizeString($this->post('email') ?? ''),
            'notes' => SecurityHelper::sanitizeString($this->post('notes') ?? ''),
            'medical_clearance' => (bool)$this->post('medical_clearance'),
        ];

        // Validate inputs
        $errors = $this->validatePlayerData($data);

        if (!empty($errors)) {
            $this->json(['errors' => $errors], 422);
            return;
        }

        // Check if national ID already exists (for different player)
        if ($player['national_id'] !== $data['national_id']) {
            if ($this->playerModel->findByNationalId($data['national_id']) !== null) {
                $this->json(['error' => 'National ID already exists'], 422);
                return;
            }
        }

        // Update player
        if (!$this->playerModel->update($playerId, $data)) {
            $this->json(['error' => 'Failed to update player'], 500);
            return;
        }

        $this->json([
            'success' => true,
            'redirect' => APP_URL . '/player/view/' . $playerId,
        ]);
    }

    /**
     * View player profile
     *
     * @param string $id Player ID
     * @return void
     */
    public function view(string $id): void
    {
        RbacMiddleware::requirePermission('view_players');

        $playerId = (int)$id;
        $player = $this->playerModel->getWithDetails($playerId);

        if ($player === null) {
            $this->redirect('/players');
        }

        $this->data['title'] = $player['name'];
        $this->data['player'] = $player;

        $this->render('players.view', $this->data);
    }

    /**
     * Delete player
     *
     * @param string $id Player ID
     * @return void
     */
    public function delete(string $id): void
    {
        RbacMiddleware::requirePermission('manage_players');

        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $playerId = (int)$id;
        $player = $this->playerModel->find($playerId);

        if ($player === null) {
            $this->json(['error' => 'Player not found'], 404);
            return;
        }

        if (!$this->playerModel->softDelete($playerId)) {
            $this->json(['error' => 'Failed to delete player'], 500);
            return;
        }

        $this->json(['success' => true]);
    }

    /**
     * Validate player data
     *
     * @param array $data Player data
     * @return array Errors
     */
    private function validatePlayerData(array $data): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors[] = 'Player name is required';
        }

        if (empty($data['date_of_birth'])) {
            $errors[] = 'Date of birth is required';
        } else {
            $dob = \DateTime::createFromFormat('Y-m-d', $data['date_of_birth']);
            if ($dob === false || $dob > new \DateTime()) {
                $errors[] = 'Invalid date of birth';
            }
        }

        if (empty($data['national_id'])) {
            $errors[] = 'National ID is required';
        }

        if (empty($data['position'])) {
            $errors[] = 'Position is required';
        } elseif (!array_key_exists($data['position'], PLAYER_POSITIONS)) {
            $errors[] = 'Invalid position';
        }

        if (!empty($data['email']) && !SecurityHelper::validateEmail($data['email'])) {
            $errors[] = 'Invalid email address';
        }

        return $errors;
    }

    /**
     * Handle file uploads
     *
     * @param int $playerId Player ID
     * @return void
     */
    private function handleFileUploads(int $playerId): void
    {
        $userId = $this->getUserId();

        foreach ($_FILES as $fieldName => $file) {
            if ($file['error'] === UPLOAD_ERR_NO_FILE) {
                continue;
            }

            $fileType = str_replace('file_', '', $fieldName);
            $this->fileUploadModel->storeFile($file, $playerId, $fileType, $userId);
        }
    }
}
