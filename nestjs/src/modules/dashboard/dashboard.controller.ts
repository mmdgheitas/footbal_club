import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { ATTENDANCE_WARNING_THRESHOLD } from '../../config/constants';
import { DashboardService } from './dashboard.service';

/** Port of app/Controllers/DashboardController.php. */
@Controller()
export class DashboardController extends BaseController {
  constructor(private readonly dashboard: DashboardService) {
    super();
  }

  @Get('/dashboard')
  async index(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Players get their own panel.
    if (this.getUserRole(req) === 'player') {
      this.redirect(res, '/player-panel');
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const stats = await this.dashboard.getStatistics();
    const monthlyRevenue = await this.dashboard.getMonthlyRevenue(currentMonth, currentYear);
    const yearlyRevenue = await this.dashboard.getYearlyRevenue(currentYear);
    const debtsReport = await this.dashboard.getDebtsReport();
    const lowAttendance = await this.dashboard.getPlayersWithLowAttendance();

    // Mirrors the array_reduce over total_outstanding in the PHP controller.
    const totalOutstanding = debtsReport.reduce(
      (sum, item) => sum + Number(item.total_outstanding ?? 0),
      0,
    );

    this.render(req, res, 'dashboard/index', {
      title: 'داشبورد',
      total_players: stats.total,
      players_by_category: stats.by_category,
      players_by_position: stats.by_position,
      monthly_revenue: monthlyRevenue,
      yearly_revenue: yearlyRevenue,
      total_outstanding: totalOutstanding,
      players_with_debt: debtsReport.length,
      low_attendance_count: lowAttendance.length,
      attendance_warning_threshold: ATTENDANCE_WARNING_THRESHOLD,
    });
  }
}
