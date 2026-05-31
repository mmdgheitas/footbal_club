<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Medical;
use App\Models\Injury;
use App\Models\Player;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Medical Controller
 * PSR-12 compliant - Handles medical records and health data
 */
class MedicalController extends Controller
{
    private Medical $medicalModel;
    private Injury $injuryModel;
    private Player $playerModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->medicalModel = new Medical();
        $this->injuryModel = new Injury();
        $this->playerModel = new Player();
    }

    /**
     * List medical records
     *
     * @return void
     */
    public function index(): void
    {
        RbacMiddleware::requirePermission('view_medical');

        $players = $this->playerModel->getActive();

        $this->data['title'] = 'Medical Records';
        $this->data['players'] = $players;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('medical.index', $this->data);
    }

    /**
     * View player medical record
     *
     * @param string $id Player ID
     * @return void
     */
    public function view(string $id): void
    {
        RbacMiddleware::requirePermission('view_medical');

        $playerId = (int)$id;
        $player = $this->playerModel->find($playerId);

        if ($player === null) {
            $this->redirect('/medical');
        }

        $medical = $this->medicalModel->getByPlayerId($playerId);
        $injuries = $this->injuryModel->getByPlayerId($playerId);

        $this->data['title'] = 'Medical Record - ' . $player['name'];
        $this->data['player'] = $player;
        $this->data['medical'] = $medical;
        $this->data['injuries'] = $injuries;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('medical.view', $this->data);
    }

    /**
     * Update medical record
     *
     * @param string $id Player ID
     * @return void
     */
    public function update(string $id): void
    {
        RbacMiddleware::requirePermission('view_medical');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Method not allowed'], 405);
            return;
        }

        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $playerId = (int)$id;

        if ($this->playerModel->find($playerId) === null) {
            $this->json(['error' => 'Player not found'], 404);
            return;
        }

        $data = [
            'player_id' => $playerId,
            'blood_type' => SecurityHelper::sanitizeString($this->post('blood_type') ?? ''),
            'allergies' => SecurityHelper::sanitizeString($this->post('allergies') ?? ''),
            'medical_conditions' => SecurityHelper::sanitizeString($this->post('medical_conditions') ?? ''),
            'vaccination_status' => SecurityHelper::sanitizeString($this->post('vaccination_status') ?? ''),
            'last_exam_date' => $this->post('last_exam_date') ?? null,
            'exam_notes' => SecurityHelper::sanitizeString($this->post('exam_notes') ?? ''),
        ];

        if (!$this->medicalModel->createOrUpdate($data)) {
            $this->json(['error' => 'Failed to update medical record'], 500);
            return;
        }

        $this->json(['success' => true]);
    }
}
