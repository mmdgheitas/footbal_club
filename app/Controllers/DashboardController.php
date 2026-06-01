<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Player;
use App\Models\Payment;
use App\Models\Attendance;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Dashboard Controller
 * PSR-12 compliant - Main dashboard and overview
 */
class DashboardController extends Controller
{
    private Player $playerModel;
    private Payment $paymentModel;
    private Attendance $attendanceModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->playerModel = new Player();
        $this->paymentModel = new Payment();
        $this->attendanceModel = new Attendance();
    }

    /**
     * Display main dashboard
     *
     * @return void
     */
    public function index(): void
    {
        $this->data['title'] = 'داشبورد';

        // Get statistics
        $stats = $this->playerModel->getStatistics();
        $this->data['total_players'] = $stats['total'];
        $this->data['players_by_category'] = $stats['by_category'];
        $this->data['players_by_position'] = $stats['by_position'];

        // Get financial overview
        $currentMonth = date('m');
        $currentYear = date('Y');
        $monthlyRevenue = $this->paymentModel->getMonthlyRevenue((int)$currentMonth, (int)$currentYear);
        $this->data['monthly_revenue'] = $monthlyRevenue;

        // Get yearly revenue for chart
        $yearlyRevenue = $this->paymentModel->getYearlyRevenue((int)$currentYear);
        $this->data['yearly_revenue'] = $yearlyRevenue;

        // Get outstanding debts
        $debtsReport = $this->paymentModel->getDebtsReport();
        $this->data['total_outstanding'] = array_reduce(
            $debtsReport,
            fn ($sum, $item) => $sum + ($item['total_outstanding'] ?? 0),
            0
        );
        $this->data['players_with_debt'] = count($debtsReport);

        // Get low attendance warnings
        $lowAttendance = $this->attendanceModel->getPlayersWithLowAttendance();
        $this->data['low_attendance_count'] = count($lowAttendance);

        $this->render('dashboard.index', $this->data);
    }
}
