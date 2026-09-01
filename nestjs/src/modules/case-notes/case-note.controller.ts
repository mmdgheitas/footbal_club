import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseController } from '../../common/views/base.controller';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { CaseNoteService } from './case-note.service';

const APP_URL = process.env.APP_URL ?? '';

/** Duplicated verbatim in the legacy index(), create() and edit(). */
const NOTE_TYPES = {
  general: 'عمومی',
  medical: 'پزشکی',
  disciplinary: 'انظباطی',
  achievement: 'دستاورد',
  concern: 'نگرانی',
};

const SEVERITIES = {
  low: 'کم',
  medium: 'متوسط',
  high: 'بالا',
};

/** PHP (bool) cast combined with `?? $fallback` - see AchievementController. */
function phpBool(value: any, fallback: any): boolean {
  if (value === null || value === undefined) {
    return Boolean(fallback);
  }
  if (value === '' || value === '0' || value === 0) {
    return false;
  }
  return Boolean(value);
}

/**
 * Port of app/Controllers/CaseNoteController.php (7 routes).
 * Every route requires manage_players.
 */
@Controller()
export class CaseNoteController extends BaseController {
  constructor(private readonly caseNotes: CaseNoteService) {
    super();
  }

  /** GET /case-notes */
  @Get('/case-notes')
  @Permissions('manage_players')
  async index(@Req() req: Request, @Res() res: Response) {
    const playerId = this.query(req, 'player_id')
      ? parseInt(String(this.query(req, 'player_id')), 10)
      : null;

    let caseNotes: any[];
    let player: any = null;
    if (playerId) {
      caseNotes = await this.caseNotes.getByPlayerId(playerId, false);
      player = await this.caseNotes.findPlayer(playerId);
    } else {
      caseNotes = await this.caseNotes.getHighSeverityNotes();
    }

    const allPlayers = await this.caseNotes.getActivePlayers();

    return this.render(req, res, 'case_notes/index', {
      title: 'مدیریت پرونده‌ها',
      case_notes: caseNotes,
      players: allPlayers,
      selected_player: player,
      csrf_token: this.generateCsrf(req),
      note_types: NOTE_TYPES,
      severities: SEVERITIES,
    });
  }

  /** GET /case-notes/create */
  @Get('/case-notes/create')
  @Permissions('manage_players')
  async create(@Req() req: Request, @Res() res: Response) {
    const players = await this.caseNotes.getActivePlayers();

    return this.render(req, res, 'case_notes/form', {
      title: 'افزودن یادداشت پرونده',
      players,
      note_types: NOTE_TYPES,
      severities: SEVERITIES,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /case-notes/store */
  @Post('/case-notes/store')
  @Permissions('manage_players')
  async store(@Req() req: Request, @Res() res: Response) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const adminId = this.getUserId(req);
    const playerId = parseInt(String(this.post(req, 'player_id') ?? 0), 10) || 0;
    const title = SecurityHelper.sanitizeString(this.post(req, 'title') ?? '');
    const content = SecurityHelper.sanitizeString(this.post(req, 'content') ?? '');
    const noteType = this.post(req, 'note_type') ?? 'general';
    const severity = this.post(req, 'severity') ?? 'low';
    // Note the default here is false, unlike achievements.
    const isVisible = phpBool(this.post(req, 'is_visible_to_player'), false);

    if (!playerId) {
      return this.json(res, { error: 'Player is required' }, 422);
    }
    if (!title) {
      return this.json(res, { error: 'Title is required' }, 422);
    }
    if (!content) {
      return this.json(res, { error: 'Content is required' }, 422);
    }

    const player = await this.caseNotes.findPlayer(playerId);
    if (player === null) {
      return this.json(res, { error: 'Player not found' }, 404);
    }

    const linkedUser = await this.caseNotes.findUserByPlayerId(playerId);
    const userId = linkedUser?.id ?? null;

    const caseNoteId = await this.caseNotes.createCaseNote({
      player_id: playerId,
      user_id: userId,
      note_type: noteType,
      title,
      content,
      severity,
      created_by: adminId,
      is_visible_to_player: isVisible ? 1 : 0,
    });

    if (!caseNoteId) {
      return this.json(res, { error: 'Failed to create case note' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'Case note created successfully',
      redirect: `${APP_URL}/case-notes?player_id=${playerId}`,
    });
  }

  /** GET /case-notes/edit/:id */
  @Get('/case-notes/edit/:id')
  @Permissions('manage_players')
  async edit(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const caseNoteId = parseInt(id, 10);
    const caseNote = await this.caseNotes.getCaseNote(caseNoteId);

    if (caseNote === null) {
      return this.redirect(res, '/case-notes');
    }

    const players = await this.caseNotes.getActivePlayers();

    return this.render(req, res, 'case_notes/form', {
      title: 'ویرایش یادداشت پرونده',
      case_note: caseNote,
      players,
      note_types: NOTE_TYPES,
      severities: SEVERITIES,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /case-notes/update/:id */
  @Post('/case-notes/update/:id')
  @Permissions('manage_players')
  async update(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const caseNoteId = parseInt(id, 10);
    const caseNote = await this.caseNotes.getCaseNote(caseNoteId);

    if (caseNote === null) {
      return this.json(res, { error: 'Case note not found' }, 404);
    }

    const playerId =
      parseInt(String(this.post(req, 'player_id') ?? caseNote.player_id), 10) || 0;
    const title = SecurityHelper.sanitizeString(this.post(req, 'title') ?? '');
    const content = SecurityHelper.sanitizeString(this.post(req, 'content') ?? '');
    const noteType = this.post(req, 'note_type') ?? caseNote.note_type;
    const severity = this.post(req, 'severity') ?? caseNote.severity;
    const isVisible = phpBool(
      this.post(req, 'is_visible_to_player'),
      caseNote.is_visible_to_player,
    );

    if (!playerId) {
      return this.json(res, { error: 'Player is required' }, 422);
    }
    if (!title) {
      return this.json(res, { error: 'Title is required' }, 422);
    }
    if (!content) {
      return this.json(res, { error: 'Content is required' }, 422);
    }

    const player = await this.caseNotes.findPlayer(playerId);
    if (player === null) {
      return this.json(res, { error: 'Player not found' }, 404);
    }

    const linkedUser = await this.caseNotes.findUserByPlayerId(playerId);
    const userId = linkedUser?.id ?? null;

    const ok = await this.caseNotes.updateCaseNote(caseNoteId, {
      player_id: playerId,
      user_id: userId,
      note_type: noteType,
      title,
      content,
      severity,
      is_visible_to_player: isVisible ? 1 : 0,
    });

    if (!ok) {
      return this.json(res, { error: 'Failed to update case note' }, 500);
    }

    return this.json(res, {
      success: true,
      message: 'Case note updated successfully',
      redirect: `${APP_URL}/case-notes?player_id=${playerId}`,
    });
  }

  /** POST /case-notes/delete/:id - soft delete */
  @Post('/case-notes/delete/:id')
  @Permissions('manage_players')
  async delete(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const caseNoteId = parseInt(id, 10);
    if (!(await this.caseNotes.deleteCaseNote(caseNoteId))) {
      return this.json(res, { error: 'Failed to delete case note' }, 500);
    }

    return this.json(res, { success: true, message: 'Case note deleted' });
  }

  /** POST /case-notes/toggle-visibility/:id */
  @Post('/case-notes/toggle-visibility/:id')
  @Permissions('manage_players')
  async toggleVisibility(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    const caseNoteId = parseInt(id, 10);
    const caseNote = await this.caseNotes.getCaseNote(caseNoteId);

    if (caseNote === null) {
      return this.json(res, { error: 'Case note not found' }, 404);
    }

    const newVisibility = !caseNote.is_visible_to_player;
    if (!(await this.caseNotes.updateVisibility(caseNoteId, newVisibility))) {
      return this.json(res, { error: 'Failed to update visibility' }, 500);
    }

    return this.json(res, {
      success: true,
      is_visible_to_player: newVisibility,
    });
  }
}
