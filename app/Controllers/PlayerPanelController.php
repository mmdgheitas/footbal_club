<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Player;
use App\Models\Payment;
use App\Models\Attendance;
use App\Models\Alert;
use App\Models\Achievement;
use App\Models\CaseNote;
use App\Models\HomeworkVideo;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Player Panel Controller
 * PSR-12 compliant - Manages pages for logged-in players and guardians
 */
class PlayerPanelController extends Controller
{
    private Player $playerModel;
    private Payment $paymentModel;
    private Attendance $attendanceModel;
    private Alert $alertModel;
    private int $playerId = 0;
    private array $playerData = [];

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        
        // Assert player role
        if ($this->getUserRole() !== 'player') {
            $this->redirect('/403');
        }

        $this->playerModel = new Player();
        $this->paymentModel = new Payment();
        $this->attendanceModel = new Attendance();
        $this->alertModel = new Alert();

        // Get linked player profile
        $user = $this->getUser();
        $this->playerId = (int)($user['player_id'] ?? 0);

        if ($this->playerId === 0) {
            $this->data['title'] = 'خطا';
            $this->render('player_panel.no_link', $this->data);
            exit;
        }

        $player = $this->playerModel->find($this->playerId);
        if ($player === null || $player['status'] !== 1) {
            $this->data['title'] = 'خطا';
            $this->render('player_panel.no_link', $this->data);
            exit;
        }
        
        // Check if user documents are approved
        if (($user['document_status'] ?? '') !== 'approved') {
            $this->redirect('/documents/upload');
            exit;
        }
        
        $this->playerData = $player;
    }

    /**
     * Player Dashboard
     *
     * @return void
     */
    public function index(): void
    {
        $this->data['title'] = 'داشبورد بازیکن';
        $this->data['player'] = $this->playerData;

        // Statistics
        $this->data['attendance_rate'] = $this->attendanceModel->getAttendancePercentage($this->playerId);
        $this->data['total_outstanding'] = $this->paymentModel->getTotalOutstandingByPlayer($this->playerId);
        $this->data['total_paid'] = $this->paymentModel->getTotalPaidByPlayer($this->playerId);

        // Recent alerts
        $ageCategory = $this->playerData['age_category'] ?? 'senior';
        $allAlerts = $this->alertModel->getAlertsForPlayer($ageCategory);
        $this->data['recent_alerts'] = array_slice($allAlerts, 0, 3);

        $this->render('player_panel.index', $this->data);
    }

    /**
     * Financial status - Debt and Creditor info
     *
     * @return void
     */
    public function financial(): void
    {
        $this->data['title'] = 'وضعیت مالی';
        $this->data['player'] = $this->playerData;
        $this->data['payments'] = $this->paymentModel->getByPlayerId($this->playerId);
        $this->data['total_outstanding'] = $this->paymentModel->getTotalOutstandingByPlayer($this->playerId);
        $this->data['total_paid'] = $this->paymentModel->getTotalPaidByPlayer($this->playerId);

        $this->render('player_panel.financial', $this->data);
    }

    /**
     * Presence/absence status
     *
     * @return void
     */
    public function attendance(): void
    {
        $this->data['title'] = 'حضور و غیاب';
        $this->data['player'] = $this->playerData;
        
        $attendanceRecords = $this->attendanceModel->getByPlayerId($this->playerId);
        $this->data['attendance'] = $attendanceRecords;

        // Calculate statistics
        $present = 0;
        $absent = 0;
        $excused = 0;
        $late = 0;

        foreach ($attendanceRecords as $record) {
            $status = (int)$record['status'];
            if ($status === 1) $present++;
            elseif ($status === 2) $absent++;
            elseif ($status === 3) $excused++;
            elseif ($status === 4) $late++;
        }

        $this->data['stats'] = [
            'total' => count($attendanceRecords),
            'present' => $present,
            'absent' => $absent,
            'excused' => $excused,
            'late' => $late,
            'percentage' => $this->attendanceModel->getAttendancePercentage($this->playerId)
        ];

        $this->render('player_panel.attendance', $this->data);
    }

    /**
     * Personal Info (Profile, Guardians, Medical, Injury records)
     *
     * @return void
     */
    public function profile(): void
    {
        $this->data['title'] = 'مشخصات فردی';
        
        $playerDetails = $this->playerModel->getWithDetails($this->playerId);
        $this->data['player_details'] = $playerDetails;

        $this->render('player_panel.profile', $this->data);
    }

    /**
     * Admin alerts list
     *
     * @return void
     */
    public function alerts(): void
    {
        $this->data['title'] = 'اعلانات باشگاه';
        
        $ageCategory = $this->playerData['age_category'] ?? 'senior';
        $classroomId = $this->playerData['classroom_id'] ?? null;
        $this->data['alerts'] = $this->alertModel->getAlertsForPlayer($ageCategory, $this->playerId, $classroomId);

        $this->render('player_panel.alerts', $this->data);
    }

    /**
     * View player achievements
     *
     * @return void
     */
    public function achievements(): void
    {
        $achievementModel = new Achievement();
        $this->data['title'] = 'دستاوردهای من';
        $this->data['achievements'] = $achievementModel->getByPlayerId($this->playerId, true);
        $this->data['stats'] = $achievementModel->getPlayerStats($this->playerId);
        $this->data['player'] = $this->playerData;

        $this->render('player_panel.achievements', $this->data);
    }

    /**
     * View player case notes (visible to player)
     *
     * @return void
     */
    public function caseNotes(): void
    {
        $caseNoteModel = new CaseNote();
        $this->data['title'] = 'یادداشت‌های پرونده';
        $this->data['case_notes'] = $caseNoteModel->getByPlayerId($this->playerId, true);
        $this->data['player'] = $this->playerData;

        $this->render('player_panel.case_notes', $this->data);
    }

    /**
     * View and upload homework
     *
     * @return void
     */
    public function homework(): void
    {
        $homeworkModel = new HomeworkVideo();
        $this->data['title'] = 'تمرینات من';
        $this->data['videos'] = $homeworkModel->getByPlayerId($this->playerId);
        $this->data['player'] = $this->playerData;
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('player_panel.homework', $this->data);
    }
}
