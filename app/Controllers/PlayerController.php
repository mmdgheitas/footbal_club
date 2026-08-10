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
        // RbacMiddleware::requirePermission('view_players');
        RbacMiddleware::requirePermission('manage_players');

        $page = (int)($this->get('page') ?? 1);
        $search = SecurityHelper::sanitizeString($this->get('search') ?? '');
        $classroomId = $this->get('classroom_id') ? (int)$this->get('classroom_id') : null;

        $classroomModel = new \App\Models\Classroom();
        $classrooms = $classroomModel->all();

        $paginated = $this->playerModel->getPlayersList($page, $search, $classroomId);
        $players = $paginated['data'];
        $this->data['pagination'] = $paginated;

        $this->data['title'] = 'بازیکنان';
        $this->data['players'] = $players;
        $this->data['classrooms'] = $classrooms;
        $this->data['selected_classroom_id'] = $classroomId;
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

        $classroomModel = new \App\Models\Classroom();
        $this->data['classrooms'] = $classroomModel->all();

        $this->data['title'] = 'افزودن بازیکن';
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

        $rawDob = $this->post('date_of_birth') ?? '';
        $dob = $rawDob;
        if (!empty($rawDob)) {
            $normalized = str_replace('-', '/', trim((string)$rawDob));
            $normalized = \App\Helpers\JalaliHelper::persianToLatinNumbers($normalized);
            $parts = explode('/', $normalized);
            if (count($parts) === 3) {
                $year = (int)$parts[0];
                if ($year >= 1300 && $year <= 1500) {
                    $dob = \App\Helpers\JalaliHelper::toGregorianString((string)$rawDob);
                }
            }
        }

        $medicalClearance = (bool)$this->post('medical_clearance');
        
        // Check if medical_clearance is checked but no medical records are uploaded
        if ($medicalClearance && empty($_FILES)) {
            $this->json(['error' => 'برای تأیید مجوز پزشکی، باید حداقل یک سند پزشکی آپلود کنید'], 422);
            return;
        }
        
        // Check if medical_clearance is checked but no medical_clearance file is uploaded
        if ($medicalClearance) {
            $hasMedicalFile = false;
            foreach ($_FILES as $fieldName => $file) {
                if (strpos($fieldName, 'medical_clearance') !== false || $fieldName === 'medical_clearance') {
                    $hasMedicalFile = true;
                    break;
                }
            }
            if (!$hasMedicalFile) {
                $this->json(['error' => 'برای تأیید مجوز پزشکی، باید سند مجوز پزشکی آپلود کنید'], 422);
                return;
            }
        }

        $data = [
            'name' => SecurityHelper::sanitizeString($this->post('name') ?? ''),
            'date_of_birth' => $dob,
            'classroom_id' => $this->post('classroom_id') ? (int)$this->post('classroom_id') : null,
            'national_id' => SecurityHelper::sanitizeString($this->post('national_id') ?? ''),
            'position' => $this->post('position') ?? '',
            'phone' => SecurityHelper::sanitizeString($this->post('phone') ?? ''),
            'email' => SecurityHelper::sanitizeString($this->post('email') ?? ''),
            'notes' => SecurityHelper::sanitizeString($this->post('notes') ?? ''),
            'medical_clearance' => $medicalClearance,
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

        // Convert date of birth to Jalali format YYYY/MM/DD
        if (!empty($player['date_of_birth'])) {
            $player['date_of_birth'] = \App\Helpers\JalaliHelper::toJalaliString($player['date_of_birth']);
        }

        $classroomModel = new \App\Models\Classroom();
        $this->data['classrooms'] = $classroomModel->all();

        $this->data['title'] = 'ویرایش بازیکن';
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

        $rawDob = $this->post('date_of_birth') ?? '';
        $dob = $rawDob;
        if (!empty($rawDob)) {
            $normalized = str_replace('-', '/', trim((string)$rawDob));
            $normalized = \App\Helpers\JalaliHelper::persianToLatinNumbers($normalized);
            $parts = explode('/', $normalized);
            if (count($parts) === 3) {
                $year = (int)$parts[0];
                if ($year >= 1300 && $year <= 1500) {
                    $dob = \App\Helpers\JalaliHelper::toGregorianString((string)$rawDob);
                }
            }
        }

        $medicalClearance = (bool)$this->post('medical_clearance');
        
        // Check if medical_clearance is being set to true but no medical records exist
        if ($medicalClearance && !$player['medical_clearance']) {
            // Check if there are any medical_clearance files already uploaded
            $fileUploadModel = new \App\Models\FileUpload();
            $medicalFiles = $fileUploadModel->findAllBy('player_id', (string)$playerId, 'file_type', 'medical_clearance');
            
            // Also check document submissions
            $documentModel = new \App\Models\DocumentSubmission();
            $medicalDocs = $documentModel->getByPlayerId($playerId);
            $hasMedicalDoc = false;
            foreach ($medicalDocs as $doc) {
                if ($doc['document_type'] === 'medical_clearance' && $doc['status'] === 'approved') {
                    $hasMedicalDoc = true;
                    break;
                }
            }
            
            if (empty($medicalFiles) && !$hasMedicalDoc) {
                $this->json(['error' => 'برای تأیید مجوز پزشکی، باید سند مجوز پزشکی آپلود و تأیید شده باشد'], 422);
                return;
            }
        }

        $data = [
            'name' => SecurityHelper::sanitizeString($this->post('name') ?? ''),
            'date_of_birth' => $dob,
            'classroom_id' => $this->post('classroom_id') ? (int)$this->post('classroom_id') : null,
            'national_id' => SecurityHelper::sanitizeString($this->post('national_id') ?? ''),
            'position' => $this->post('position') ?? '',
            'phone' => SecurityHelper::sanitizeString($this->post('phone') ?? ''),
            'email' => SecurityHelper::sanitizeString($this->post('email') ?? ''),
            'notes' => SecurityHelper::sanitizeString($this->post('notes') ?? ''),
            'medical_clearance' => $medicalClearance,
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

        // Handle new file uploads
        if (!empty($_FILES)) {
            $this->handleFileUploads($playerId);
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
