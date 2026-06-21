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

        $dateParam = SecurityHelper::sanitizeString($this->get('date') ?? '');
        $classroomId = $this->get('classroom_id') ? (int)$this->get('classroom_id') : 0;

        // Fetch classrooms list
        $classroomModel = new \App\Models\Classroom();
        $classrooms = $classroomModel->all();

        // Default to first classroom if none selected
        if ($classroomId === 0 && !empty($classrooms)) {
            $classroomId = (int)$classrooms[0]['id'];
        }

        // Determine Gregorian and Jalali dates
        $sessionDateGregorian = '';
        $sessionDateJalali = '';

        if (empty($dateParam)) {
            $sessionDateGregorian = date(DATE_FORMAT);
            $sessionDateJalali = \App\Helpers\JalaliHelper::toJalaliString($sessionDateGregorian);
        } else {
            // Check if Jalali
            $normalized = str_replace('-', '/', trim($dateParam));
            $normalized = \App\Helpers\JalaliHelper::persianToLatinNumbers($normalized);
            $parts = explode('/', $normalized);
            if (count($parts) === 3) {
                $year = (int)$parts[0];
                if ($year >= 1300 && $year <= 1500) {
                    $sessionDateGregorian = \App\Helpers\JalaliHelper::toGregorianString($dateParam);
                    $sessionDateJalali = $normalized;
                } else {
                    $sessionDateGregorian = $dateParam;
                    $sessionDateJalali = \App\Helpers\JalaliHelper::toJalaliString($dateParam);
                }
            } else {
                $sessionDateGregorian = date(DATE_FORMAT);
                $sessionDateJalali = \App\Helpers\JalaliHelper::toJalaliString($sessionDateGregorian);
            }
        }

        // Validate Gregorian date
        $dateObj = \DateTime::createFromFormat(DATE_FORMAT, $sessionDateGregorian);
        if ($dateObj === false) {
            $sessionDateGregorian = date(DATE_FORMAT);
            $sessionDateJalali = \App\Helpers\JalaliHelper::toJalaliString($sessionDateGregorian);
        }

        // Fetch players for the classroom
        $players = [];
        if ($classroomId > 0) {
            $players = $this->playerModel->getByClassroom($classroomId);
        }

        $attendance = $this->attendanceModel->getBySessionDate($sessionDateGregorian);

        // Create attendance map
        $attendanceMap = [];
        foreach ($attendance as $record) {
            $attendanceMap[$record['player_id']] = $record;
        }

        $this->data['title'] = 'حضور و غیاب';
        $this->data['session_date'] = $sessionDateGregorian;
        $this->data['session_date_jalali'] = $sessionDateJalali;
        $this->data['classrooms'] = $classrooms;
        $this->data['selected_classroom_id'] = $classroomId;
        $this->data['players'] = $players;
        $this->data['attendance_map'] = $attendanceMap;
        $this->data['attendance_status'] = ATTENDANCE_STATUS_LABELS;
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

        // Convert session date if Jalali
        $normalized = str_replace('-', '/', trim($sessionDate));
        $normalized = \App\Helpers\JalaliHelper::persianToLatinNumbers($normalized);
        $parts = explode('/', $normalized);
        if (count($parts) === 3) {
            $year = (int)$parts[0];
            if ($year >= 1300 && $year <= 1500) {
                $sessionDate = \App\Helpers\JalaliHelper::toGregorianString($sessionDate);
            }
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
        $this->data['attendance_status'] = ATTENDANCE_STATUS_LABELS;

        $this->render('attendance.report', $this->data);
    }
}
