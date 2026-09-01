import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { phpUniqid } from '../../common/upload/uniqid';
import { PLAYER_UPLOAD_PATH } from '../../config/constants';
import { HomeworkService } from './homework.service';

const APP_URL = process.env.APP_URL ?? '';
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const COACH_ROLES = ['coach', 'super_admin'];

/** PHP date('Ymd') in local time. */
function ymd(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/**
 * Port of app/Controllers/HomeworkController.php (5 routes).
 *
 * Role checks are inline in the legacy code rather than RBAC permissions:
 * upload/store are player-only, the three review routes are coach/super_admin
 * only. Kept inline.
 */
@Controller()
export class HomeworkController extends BaseController {
  constructor(private readonly homework: HomeworkService) {
    super();
  }

  /** GET /homework/upload */
  @Get('/homework/upload')
  async upload(@Req() req: Request, @Res() res: Response) {
    const user: any = this.getUser(req);

    if (user === null || (user.role ?? '') !== 'player') {
      return this.redirect(res, '/403');
    }

    const playerId = user.player_id ?? null;
    let player: any = null;
    if (playerId) {
      player = await this.homework.findPlayer(playerId);
    }

    const classrooms: any[] = [];
    if (player && player.classroom_id) {
      const classroom = await this.homework.findClassroom(
        parseInt(player.classroom_id, 10),
      );
      if (classroom) {
        classrooms.push(classroom);
      }
    }

    const videos = await this.homework.getByPlayerId(playerId);

    return this.render(req, res, 'homework/upload', {
      title: 'آپلود تمرین',
      player,
      classrooms,
      videos,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /homework/store */
  @Post('/homework/store')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VIDEO_SIZE },
    }),
  )
  async store(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const userId = this.getUserId(req);
    const user: any = this.getUser(req);

    if (user === null || (user.role ?? '') !== 'player') {
      return this.json(res, { error: 'Unauthorized' }, 403);
    }

    const playerId = user.player_id ?? null;
    if (!playerId) {
      return this.json(res, { error: 'Player profile not found' }, 403);
    }

    const title = SecurityHelper.sanitizeString(this.post(req, 'title') ?? '');
    const description = SecurityHelper.sanitizeString(
      this.post(req, 'description') ?? '',
    );
    const classroomId = this.post(req, 'classroom_id')
      ? parseInt(String(this.post(req, 'classroom_id')), 10)
      : null;

    if (!title) {
      return this.json(res, { error: 'Title is required' }, 422);
    }

    // empty($_FILES['video'])
    if (!file) {
      return this.json(res, { error: 'No video file uploaded' }, 422);
    }

    const validation = this.validateVideoFile(file);
    if (validation !== true) {
      return this.json(res, { error: validation }, 422);
    }

    const uploadResult = this.storeVideoFile(file);
    if (!uploadResult.success) {
      return this.json(res, { error: uploadResult.error }, 500);
    }

    const videoId = await this.homework.createVideo({
      player_id: playerId,
      user_id: userId,
      classroom_id: classroomId,
      title,
      description,
      video_path: uploadResult.file_path,
      original_filename: uploadResult.original_filename,
      stored_filename: uploadResult.stored_filename,
      mime_type: uploadResult.mime_type,
      file_size: uploadResult.file_size,
      duration_seconds: uploadResult.duration ?? null,
      status: 'submitted',
    });

    if (!videoId) {
      if (fs.existsSync(uploadResult.file_path!)) {
        fs.unlinkSync(uploadResult.file_path!);
      }
      return this.json(res, { error: 'Failed to save video record' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'Video uploaded successfully',
      video_id: videoId,
      redirect: `${APP_URL}/homework/upload`,
    });
  }

  /** GET /homework/review-list - coach/super_admin only. */
  @Get('/homework/review-list')
  async reviewList(@Req() req: Request, @Res() res: Response) {
    const userId = this.getUserId(req);
    const user: any = this.getUser(req);

    if (user === null || !COACH_ROLES.includes(user.role ?? '')) {
      return this.redirect(res, '/403');
    }

    const classrooms = await this.homework.getClassroomsByCoachId(userId!);
    const videos =
      classrooms.length === 0
        ? await this.homework.getPending()
        : await this.homework.getByCoachId(userId!);

    return this.render(req, res, 'homework/review_list', {
      title: 'بررسی تمرینات',
      videos,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** GET /homework/review/:id - coach/super_admin only. */
  @Get('/homework/review/:id')
  async review(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const user: any = this.getUser(req);

    if (user === null || !COACH_ROLES.includes(user.role ?? '')) {
      return this.redirect(res, '/403');
    }

    const videoId = parseInt(id, 10);
    const video = await this.homework.getVideo(videoId);

    if (video === null) {
      return this.redirect(res, '/homework/review-list');
    }

    return this.render(req, res, 'homework/review', {
      title: `بررسی ویدئو: ${video.title ?? 'Unknown'}`,
      video,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /homework/submit-review/:id - coach/super_admin only. */
  @Post('/homework/submit-review/:id')
  async submitReview(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const userId = this.getUserId(req);
    const user: any = this.getUser(req);

    if (user === null || !COACH_ROLES.includes(user.role ?? '')) {
      return this.json(res, { error: 'Unauthorized' }, 403);
    }

    const videoId = parseInt(id, 10);
    const feedback = SecurityHelper.sanitizeString(this.post(req, 'feedback') ?? '');
    const rating = this.post(req, 'rating')
      ? parseInt(String(this.post(req, 'rating')), 10)
      : null;

    if (!feedback) {
      return this.json(res, { error: 'Feedback is required' }, 422);
    }

    const result = await this.homework.review(videoId, userId!, feedback, rating);
    if (!result) {
      return this.json(res, { error: 'Failed to save review' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'Review submitted successfully',
      redirect: `${APP_URL}/homework/review-list`,
    });
  }

  /** HomeworkController::validateVideoFile() */
  private validateVideoFile(file: Express.Multer.File): string | true {
    if (file.size > MAX_VIDEO_SIZE) {
      return 'Video size exceeds maximum allowed size (50MB)';
    }

    const allowedMimes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-flv',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      return 'File type not allowed. Allowed: MP4, WebM, MOV, AVI, FLV';
    }

    const extension = path.extname(file.originalname).slice(1).toLowerCase();
    const allowedExtensions = ['mp4', 'webm', 'mov', 'avi', 'flv', 'mkv'];
    if (!allowedExtensions.includes(extension)) {
      return 'File extension not allowed';
    }

    return true;
  }

  /** HomeworkController::storeVideoFile() */
  private storeVideoFile(file: Express.Multer.File): {
    success: boolean;
    error?: string;
    file_path?: string;
    original_filename?: string;
    stored_filename?: string;
    mime_type?: string;
    file_size?: number;
    duration?: number | null;
  } {
    const uploadDir = `${PLAYER_UPLOAD_PATH}/homework`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    }

    const extension = path.extname(file.originalname).slice(1);
    const storedFilename = `${phpUniqid(`hw_${ymd()}_`, true)}.${extension}`;
    const filePath = `${uploadDir}/${storedFilename}`;

    try {
      fs.writeFileSync(filePath, file.buffer, { mode: 0o644 });
    } catch {
      return { success: false, error: 'Failed to move uploaded file' };
    }

    // ffprobe duration probe, exactly as the legacy shell_exec() call. It is
    // optional: if ffprobe is missing the duration stays null.
    let duration: number | null = null;
    try {
      const output = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${JSON.stringify(
          filePath,
        )} 2>&1`,
        { encoding: 'utf8' },
      );
      if (/^-?\d+(\.\d+)?$/.test(String(output ?? '').trim())) {
        duration = parseInt(String(output).trim(), 10);
      }
    } catch {
      // ffprobe unavailable or failed - leave duration null.
    }

    return {
      success: true,
      file_path: filePath,
      original_filename: SecurityHelper.sanitizeFilename(file.originalname),
      stored_filename: storedFilename,
      mime_type: file.mimetype,
      file_size: file.size,
      duration,
    };
  }
}
