<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Attendance;
use App\Models\Player;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Attendance Controller
 * PSR-12 compliant - Handles attendance tracking
 */
class AttendanceController extends Controller
{
    private Attendance $attendanceModel;
    private Player $playerModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->attendanceModel = new Attendance();
        $this->playerModel = new Player();
    }

    /**
     * Display attendance grid
     *
     * @return void
     */
    public function index(): void
    {
        RbacMiddleware::requirePermission('mark_attendance');

        $sessionDate = SecurityHelper::sanitizeString($this->get('date') ?? date(DATE_FORMAT));

        // Validate date
        $dateObj = \DateTime::createFromFormat(DATE_FORMAT, $sessionDate);
        if ($dateObj === false) {
            $sessionDate = date(DATE_FORMAT);
        }

        $players = $this->playerModel->getActive();
        $attendance = $this->attendanceModel->getBySessionDate($sessionDate);

        // Create attendance map
        $attendanceMap = [];
        foreach ($attendance as $record) {
            $attendanceMap[$record['player_id']] = $record;
        }

        $this->data['title'] = 'Attendance';
        $this->data['session_date'] = $sessionDate;
        $this->data['players'] = $players;
        $this->data['attendance_map'] = $attendanceMap;
        $this->data['attendance_status'] = ATTENDANCE_STATUS;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('attendance.index', $this->data);
    }

    /**
     * Mark attendance (AJAX endpoint)
     *
     * @return void
     */
    public function mark(): void
    {
        RbacMiddleware::requirePermission('mark_attendance');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Method not allowed'], 405);
            return;
        }

        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }

        $playerId = (int)($this->post('player_id') ?? 0);
        $sessionDate = SecurityHelper::sanitizeString($this->post('session_date') ?? '');
        $status = (int)($this->post('status') ?? 0);

        // Validate inputs
        if ($playerId === 0) {
            $this->json(['error' => 'Player is required'], 422);
            return;
        }

        if (empty($sessionDate)) {
            $this->json(['error' => 'Session date is required'], 422);
            return;
        }

        if (!defined('ATTENDANCE_STATUS') || !in_array($status, ATTENDANCE_STATUS, true)) {
            $this->json(['error' => 'Invalid attendance status'], 422);
            return;
        }

        $userId = $this->getUserId();

        $result = $this->attendanceModel->markAttendance($playerId, $sessionDate, $status, $userId);

        if (!$result) {
            $this->json(['error' => 'Failed to mark attendance'], 500);
            return;
        }

        $this->json(['success' => true]);
    }

    /**
     * Player attendance report
     *
     * @param string $id Player ID
     * @return void
     */
    public function playerReport(string $id): void
    {
        RbacMiddleware::requirePermission('view_players');

        $playerId = (int)$id;
        $player = $this->playerModel->find($playerId);

        if ($player === null) {
            $this->redirect('/players');
        }

        $attendance = $this->attendanceModel->getByPlayerId($playerId);
        $percentage = $this->attendanceModel->getAttendancePercentage($playerId);

        $this->data['title'] = 'Attendance Report - ' . $player['name'];
        $this->data['player'] = $player;
        $this->data['attendance'] = $attendance;
        $this->data['percentage'] = number_format($percentage, 2);
        $this->data['attendance_status'] = ATTENDANCE_STATUS;

        $this->render('attendance.report', $this->data);
    }
}
