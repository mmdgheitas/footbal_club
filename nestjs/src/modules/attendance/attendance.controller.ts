import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Permissions, Roles } from '../../common/decorators/permissions.decorator';
import { createPersianPdf } from '../../common/pdf/persian-pdf';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { JalaliHelper } from '../../common/helpers/jalali.helper';
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABELS,
} from '../../config/constants';
import { AttendanceService } from './attendance.service';

/** PHP's date('Y-m-d') uses the server's local timezone, not UTC. */
function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Port of app/Controllers/AttendanceController.php (3 routes).
 */
@Controller()
export class AttendanceController extends BaseController {
  constructor(private readonly attendance: AttendanceService) {
    super();
  }

  /** GET /attendance - RbacMiddleware::requirePermission('mark_attendance') */
  @Get('/attendance')
  @Permissions('mark_attendance')
  async index(@Req() req: Request, @Res() res: Response) {
    const dateParam = SecurityHelper.sanitizeString(this.query(req, 'date') ?? '');
    let classroomId = this.query(req, 'classroom_id')
      ? parseInt(String(this.query(req, 'classroom_id')), 10)
      : 0;

    const classrooms = await this.attendance.getAllClassrooms();

    // Default to first classroom if none selected
    if (classroomId === 0 && classrooms.length > 0) {
      classroomId = parseInt(classrooms[0].id, 10);
    }

    let sessionDateGregorian = '';
    let sessionDateJalali = '';

    if (!dateParam) {
      sessionDateGregorian = todayLocal();
      sessionDateJalali = JalaliHelper.toJalaliString(sessionDateGregorian);
    } else {
      // Check if Jalali
      const normalized = JalaliHelper.persianToLatinNumbers(
        dateParam.trim().replace(/-/g, '/'),
      );
      const parts = normalized.split('/');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        if (year >= 1300 && year <= 1500) {
          sessionDateGregorian = JalaliHelper.toGregorianString(dateParam);
          sessionDateJalali = normalized;
        } else {
          sessionDateGregorian = dateParam;
          sessionDateJalali = JalaliHelper.toJalaliString(dateParam);
        }
      } else {
        sessionDateGregorian = todayLocal();
        sessionDateJalali = JalaliHelper.toJalaliString(sessionDateGregorian);
      }
    }

    // Validate Gregorian date: DateTime::createFromFormat('Y-m-d', ...) === false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDateGregorian)) {
      sessionDateGregorian = todayLocal();
      sessionDateJalali = JalaliHelper.toJalaliString(sessionDateGregorian);
    }

    let players: any[] = [];
    if (classroomId > 0) {
      players = await this.attendance.getPlayersByClassroom(classroomId);
    }

    const attendance = await this.attendance.getBySessionDate(sessionDateGregorian);

    const attendanceMap: Record<number, any> = {};
    for (const record of attendance) {
      attendanceMap[record.player_id] = record;
    }

    return this.render(req, res, 'attendance/index', {
      title: 'حضور و غیاب',
      session_date: sessionDateGregorian,
      session_date_jalali: sessionDateJalali,
      classrooms,
      selected_classroom_id: classroomId,
      players,
      attendance_map: attendanceMap,
      attendance_status: ATTENDANCE_STATUS_LABELS,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /attendance/mark - AJAX endpoint, JSON only. */
  @Post('/attendance/mark')
  @Permissions('mark_attendance')
  async mark(@Req() req: Request, @Res() res: Response) {
    if (req.method !== 'POST') {
      return this.json(res, { error: 'روش درخواست مجاز نیست.' }, 405);
    }

    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'نشست شما منقضی شده است؛ صفحه را تازه کنید.' }, 403);
    }

    const playerId = parseInt(String(this.post(req, 'player_id') ?? 0), 10) || 0;
    let sessionDate = SecurityHelper.sanitizeString(
      this.post(req, 'session_date') ?? '',
    );
    const status = parseInt(String(this.post(req, 'status') ?? 0), 10) || 0;

    if (playerId === 0) {
      return this.json(res, { error: 'انتخاب بازیکن الزامی است.' }, 422);
    }

    if (!sessionDate) {
      return this.json(res, { error: 'تاریخ جلسه الزامی است.' }, 422);
    }

    // Convert session date if Jalali
    const normalized = JalaliHelper.persianToLatinNumbers(
      sessionDate.trim().replace(/-/g, '/'),
    );
    const parts = normalized.split('/');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      if (year >= 1300 && year <= 1500) {
        sessionDate = JalaliHelper.toGregorianString(sessionDate);
      }
    }

    // in_array($status, ATTENDANCE_STATUS, true) - valid codes are 1..4
    const validStatuses: number[] = Object.values(ATTENDANCE_STATUS);
    if (!validStatuses.includes(status)) {
      return this.json(res, { error: 'وضعیت حضور و غیاب معتبر نیست.' }, 422);
    }

    const userId = this.getUserId(req) ?? 0;

    const result = await this.attendance.markAttendance(
      playerId,
      sessionDate,
      status,
      userId,
    );

    if (!result) {
      return this.json(res, { error: 'ثبت حضور و غیاب انجام نشد.' }, 500);
    }

    return this.json(res, { success: true });
  }

  @Get('/admin/attendance/report.pdf')
  @Roles('super_admin')
  async pdfReport(@Req() req: Request, @Res() res: Response) {
    const classroomId = parseInt(String(this.query(req, 'classroom_id') ?? 0), 10);
    const period = this.query(req, 'period') === 'quarterly' ? 'quarterly' : 'monthly';
    const end = /^\d{4}-\d{2}-\d{2}$/.test(String(this.query(req, 'end_date') ?? '')) ? String(this.query(req, 'end_date')) : todayLocal();
    const endDate = new Date(`${end}T12:00:00`);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - (period === 'quarterly' ? 3 : 1));
    startDate.setDate(startDate.getDate() + 1);
    const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const classroom = await this.attendance.findClassroom(classroomId);
    if (!classroom) return this.json(res, { error: 'کلاس انتخاب‌شده یافت نشد.' }, 404);
    const records = await this.attendance.getClassroomReport(classroomId, iso(startDate), end);
    const labels: Record<number, string> = ATTENDANCE_STATUS_LABELS;
    const grouped = new Map<string, any[]>();
    records.forEach((record) => grouped.set(record.player_name, [...(grouped.get(record.player_name) ?? []), record]));
    const rows = [...grouped.entries()].map(([name, entries], index) => {
      const valid = entries.filter((entry) => entry.session_date);
      return [
        (index + 1).toLocaleString('fa-IR'), name,
        valid.filter((entry) => Number(entry.status) === 1).length.toLocaleString('fa-IR'),
        valid.filter((entry) => Number(entry.status) === 2).length.toLocaleString('fa-IR'),
        valid.map((entry) => `${JalaliHelper.toJalaliString(String(entry.session_date).slice(0, 10))}: ${labels[entry.status] ?? 'نامشخص'}`).join('\n') || 'بدون سابقه',
      ];
    });
    const pdf = await createPersianPdf({
      title: period === 'quarterly' ? 'گزارش سه‌ماهه حضور و غیاب' : 'گزارش یک‌ماهه حضور و غیاب',
      subtitle: [`کلاس: ${classroom.name}`, `بازه گزارش: ${JalaliHelper.toJalaliString(iso(startDate))} تا ${JalaliHelper.toJalaliString(end)}`, `تاریخ تهیه: ${JalaliHelper.toJalaliString(todayLocal())}`],
      headers: ['ردیف', 'نام بازیکن', 'حضور', 'غیبت', 'جزئیات جلسات'], rows, widths: [35, 100, 45, 45, '*'],
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(period === 'quarterly' ? 'گزارش-سه-ماهه.pdf' : 'گزارش-یک-ماهه.pdf')}`);
    return res.send(pdf);
  }

  /** GET /attendance/report/:id - RbacMiddleware::requirePermission('view_players') */
  @Get('/attendance/report/:id')
  @Permissions('view_players')
  async playerReport(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    const playerId = parseInt(id, 10);
    const player = await this.attendance.findPlayer(playerId);

    if (player === null) {
      return this.redirect(res, '/players');
    }

    const [attendance, percentage] = await Promise.all([
      this.attendance.getByPlayerId(playerId),
      this.attendance.getAttendancePercentage(playerId),
    ]);

    return this.render(req, res, 'attendance/report', {
      title: `گزارش حضور و غیاب - ${player.name}`,
      player,
      attendance,
      // PHP number_format($percentage, 2)
      percentage: percentage.toFixed(2),
      attendance_status: ATTENDANCE_STATUS_LABELS,
    });
  }
}
