import * as fs from 'fs';
import * as path from 'path';
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
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityHelper } from '../../common/helpers/security.helper';
import { phpUniqid } from '../../common/upload/uniqid';
import { DOCS_UPLOAD_PATH, MAX_FILE_SIZE } from '../../config/constants';
import { DocumentService } from './document.service';

const ALLOWED_TYPES = [
  'national_id',
  'medical_clearance',
  'insurance',
  'birth_certificate',
  'other',
];

/**
 * Port of app/Controllers/DocumentController.php (5 routed actions).
 *
 * DocumentController::delete() is NOT ported: it has no route in App.php, and
 * it calls DocumentSubmission::softDelete(), which does not exist on that
 * model or on the Model base class. Porting it would add a route the legacy
 * app does not have.
 *
 * Uploads use multer with memory storage so the file is written by this code,
 * reproducing move_uploaded_file() and the legacy naming and chmod.
 */
@Controller()
export class DocumentController extends BaseController {
  constructor(private readonly documents: DocumentService) {
    super();
  }

  /** GET /documents/upload - players whose documents are not yet approved. */
  @Get('/documents/upload')
  async upload(@Req() req: Request, @Res() res: Response) {
    const userId = this.getUserId(req);
    const user: any = this.getUser(req);

    if (user === null || user.role !== 'player') {
      return this.redirect(res, '/403');
    }

    if ((user.document_status ?? '') === 'approved') {
      return this.redirect(res, '/player-panel');
    }

    const docStatus = await this.documents.getRequiredDocumentsStatus(userId!);

    return this.render(req, res, 'documents/upload', {
      title: 'آپلود اسناد',
      documents: docStatus,
      required_types: ['national_id', 'medical_clearance', 'birth_certificate'],
      csrf_token: this.generateCsrf(req),
      user_id: userId,
      document_status: user.document_status ?? 'pending',
      rejection_reason: user.rejection_reason ?? null,
    });
  }

  /** POST /documents/store */
  @Post('/documents/store')
  @UseInterceptors(
    FileInterceptor('document', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
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

    const userId = this.getUserId(req)!;
    const user: any = this.getUser(req);

    if (user === null || user.role !== 'player') {
      return this.json(res, { error: 'Unauthorized' }, 403);
    }

    const documentType = this.post(req, 'document_type') ?? '';
    if (!ALLOWED_TYPES.includes(documentType)) {
      return this.json(res, { error: 'Invalid document type' }, 422);
    }

    // empty($_FILES['document'])
    if (!file) {
      return this.json(res, { error: 'No file uploaded' }, 422);
    }

    const validation = this.validateDocumentFile(file);
    if (validation !== true) {
      return this.json(res, { error: validation }, 422);
    }

    const playerId = user.player_id ?? null;
    const uploadResult = this.storeDocumentFile(file, userId, documentType);
    if (!uploadResult.success) {
      return this.json(res, { error: uploadResult.error }, 500);
    }

    const documentId = await this.documents.createSubmission({
      user_id: userId,
      player_id: playerId,
      document_type: documentType,
      file_path: uploadResult.file_path,
      original_filename: uploadResult.original_filename,
      stored_filename: uploadResult.stored_filename,
      mime_type: uploadResult.mime_type,
      file_size: uploadResult.file_size,
      status: 'pending',
    });

    if (!documentId) {
      // The legacy removes the file again when the DB row fails.
      if (fs.existsSync(uploadResult.file_path!)) {
        fs.unlinkSync(uploadResult.file_path!);
      }
      return this.json(res, { error: 'Failed to save document record' }, 500);
    }

    if (await this.documents.hasAllDocumentsSubmitted(userId)) {
      await this.documents.updateUser(userId, { document_status: 'pending' });
    }

    return this.json(res, {
      success: true,
      message: 'Document uploaded successfully',
      document_id: documentId,
    });
  }

  /** GET /admin/documents/pending - RbacMiddleware::requirePermission('manage_documents') */
  @Get('/admin/documents/pending')
  @Permissions('manage_documents')
  async pending(@Req() req: Request, @Res() res: Response) {
    const pending = await this.documents.getPending();

    return this.render(req, res, 'documents/pending', {
      title: 'اسناد در انتظار تأیید',
      pending_documents: pending,
      csrf_token: this.generateCsrf(req),
    });
  }

  /** POST /admin/documents/approve/:id */
  @Post('/admin/documents/approve/:id')
  @Permissions('manage_documents')
  async approve(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const documentId = parseInt(id, 10);
    const adminId = this.getUserId(req)!;
    const document = await this.documents.getDocument(documentId);

    if (document === null) {
      return this.json(res, { error: 'Document not found' }, 404);
    }

    if (!(await this.documents.approve(documentId, adminId))) {
      return this.json(res, { error: 'Failed to approve document' }, 500);
    }

    if (await this.documents.hasAllDocumentsApproved(document.user_id)) {
      await this.documents.approveUserDocuments(document.user_id, adminId);
    }

    return this.json(res, { success: true, message: 'Document approved' });
  }

  /** POST /admin/documents/reject/:id */
  @Post('/admin/documents/reject/:id')
  @Permissions('manage_documents')
  async reject(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.validateCsrf(req)) {
      return this.json(res, { error: 'Invalid CSRF token' }, 403);
    }

    const documentId = parseInt(id, 10);
    const adminId = this.getUserId(req)!;
    const reason = this.post(req, 'rejection_reason') ?? '';

    if (!reason) {
      return this.json(res, { error: 'Rejection reason is required' }, 422);
    }

    const document = await this.documents.getDocument(documentId);
    if (document === null) {
      return this.json(res, { error: 'Document not found' }, 404);
    }

    if (!(await this.documents.reject(documentId, adminId, String(reason)))) {
      return this.json(res, { error: 'Failed to reject document' }, 500);
    }

    await this.documents.rejectUserDocuments(
      document.user_id,
      adminId,
      String(reason),
    );

    return this.json(res, { success: true, message: 'Document rejected' });
  }

  /** DocumentController::validateDocumentFile() */
  private validateDocumentFile(file: Express.Multer.File): string | true {
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds maximum allowed size (10MB)';
    }

    // The legacy narrows ALLOWED_MIME_TYPES to these four for documents.
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      return 'File type not allowed. Allowed: PDF, JPEG, PNG, GIF';
    }

    const extension = path.extname(file.originalname).slice(1).toLowerCase();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif'];
    if (!allowedExtensions.includes(extension)) {
      return 'File extension not allowed';
    }

    return true;
  }

  /** DocumentController::storeDocumentFile() */
  private storeDocumentFile(
    file: Express.Multer.File,
    userId: number,
    _documentType: string,
  ): { success: boolean; error?: string; file_path?: string; original_filename?: string; stored_filename?: string; mime_type?: string; file_size?: number } {
    const uploadDir = `${DOCS_UPLOAD_PATH}/documents`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    }

    const extension = path.extname(file.originalname).slice(1);
    const storedFilename = `${phpUniqid(`doc_${userId}_`, true)}.${extension}`;
    const filePath = `${uploadDir}/${storedFilename}`;

    try {
      fs.writeFileSync(filePath, file.buffer, { mode: 0o644 });
    } catch {
      return { success: false, error: 'Failed to move uploaded file' };
    }

    return {
      success: true,
      file_path: filePath,
      original_filename: SecurityHelper.sanitizeFilename(file.originalname),
      stored_filename: storedFilename,
      mime_type: file.mimetype,
      file_size: file.size,
    };
  }
}
