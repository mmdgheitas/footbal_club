<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\DocumentSubmission;
use App\Models\User;
use App\Middleware\AuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Document Controller
 * Handles student document uploads and approval workflow
 */
class DocumentController extends Controller
{
    private DocumentSubmission $documentModel;
    private User $userModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->documentModel = new DocumentSubmission();
        $this->userModel = new User();
    }

    /**
     * Show document upload form for student
     *
     * @return void
     */
    public function upload(): void
    {
        AuthMiddleware::requireAuth();
        
        $userId = $this->getUserId();
        $user = AuthMiddleware::getUser();
        
        if ($user === null || $user['role'] !== 'player') {
            $this->redirect('/403');
        }
        
        // Check if user already has all documents approved
        if (($user['document_status'] ?? '') === 'approved') {
            $this->redirect('/player-panel');
        }
        
        // Get document status for this user
        $docStatus = $this->documentModel->getRequiredDocumentsStatus($userId);
        
        $this->data['title'] = 'آپلود اسناد';
        $this->data['documents'] = $docStatus;
        $this->data['required_types'] = ['national_id', 'medical_clearance', 'birth_certificate'];
        $this->data['csrf_token'] = $this->generateCsrf();
        $this->data['user_id'] = $userId;
        $this->data['document_status'] = $user['document_status'] ?? 'pending';
        $this->data['rejection_reason'] = $user['rejection_reason'] ?? null;
        
        $this->render('documents.upload', $this->data);
    }

    /**
     * Handle document upload
     *
     * @return void
     */
    public function store(): void
    {
        AuthMiddleware::requireAuth();
        
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }
        
        $userId = $this->getUserId();
        $user = AuthMiddleware::getUser();
        
        if ($user === null || $user['role'] !== 'player') {
            $this->json(['error' => 'Unauthorized'], 403);
            return;
        }
        
        $documentType = $this->post('document_type') ?? '';
        $allowedTypes = ['national_id', 'medical_clearance', 'insurance', 'birth_certificate', 'other'];
        
        if (!in_array($documentType, $allowedTypes)) {
            $this->json(['error' => 'Invalid document type'], 422);
            return;
        }
        
        if (empty($_FILES['document'])) {
            $this->json(['error' => 'No file uploaded'], 422);
            return;
        }
        
        $file = $_FILES['document'];
        
        // Validate file
        $validation = $this->validateDocumentFile($file);
        if ($validation !== true) {
            $this->json(['error' => $validation], 422);
            return;
        }
        
        // Get player_id if user is linked to a player
        $playerId = $user['player_id'] ?? null;
        
        // Store the file
        $uploadResult = $this->storeDocumentFile($file, $userId, $playerId, $documentType);
        
        if (!$uploadResult['success']) {
            $this->json(['error' => $uploadResult['error']], 500);
            return;
        }
        
        // Create document submission record
        $submissionData = [
            'user_id' => $userId,
            'player_id' => $playerId,
            'document_type' => $documentType,
            'file_path' => $uploadResult['file_path'],
            'original_filename' => $uploadResult['original_filename'],
            'stored_filename' => $uploadResult['stored_filename'],
            'mime_type' => $uploadResult['mime_type'],
            'file_size' => $uploadResult['file_size'],
            'status' => 'pending',
        ];
        
        $documentId = $this->documentModel->createSubmission($submissionData);
        
        if (!$documentId) {
            // Clean up uploaded file
            if (file_exists($uploadResult['file_path'])) {
                unlink($uploadResult['file_path']);
            }
            $this->json(['error' => 'Failed to save document record'], 500);
            return;
        }
        
        // Check if all required documents are submitted
        if ($this->documentModel->hasAllDocumentsSubmitted($userId)) {
            // Update user document status to pending review
            $this->userModel->update($userId, ['document_status' => 'pending']);
        }
        
        $this->json([
            'success' => true,
            'message' => 'Document uploaded successfully',
            'document_id' => $documentId,
        ]);
    }

    /**
     * Delete a document
     *
     * @param string $id
     * @return void
     */
    public function delete(string $id): void
    {
        AuthMiddleware::requireAuth();
        
        $userId = $this->getUserId();
        $user = AuthMiddleware::getUser();
        
        if ($user === null || $user['role'] !== 'player') {
            $this->json(['error' => 'Unauthorized'], 403);
            return;
        }
        
        $documentId = (int)$id;
        $document = $this->documentModel->getDocument($documentId);
        
        if ($document === null) {
            $this->json(['error' => 'Document not found'], 404);
            return;
        }
        
        // Check if document belongs to this user
        if ((int)$document['user_id'] !== $userId) {
            $this->json(['error' => 'Unauthorized'], 403);
            return;
        }
        
        // Soft delete the document
        $result = $this->documentModel->softDelete($documentId);
        
        if (!$result) {
            $this->json(['error' => 'Failed to delete document'], 500);
            return;
        }
        
        // Also delete the file from server
        if (file_exists($document['file_path'])) {
            unlink($document['file_path']);
        }
        
        // Update user document status if all documents are not submitted
        if (!$this->documentModel->hasAllDocumentsSubmitted($userId)) {
            $this->userModel->update($userId, ['document_status' => 'pending']);
        }
        
        $this->json(['success' => true, 'message' => 'Document deleted']);
    }

    /**
     * Admin: List pending document approvals
     *
     * @return void
     */
    public function pending(): void
    {
        RbacMiddleware::requirePermission('manage_documents');
        
        $pending = $this->documentModel->getPending();
        
        $this->data['title'] = 'اسناد در انتظار تأیید';
        $this->data['pending_documents'] = $pending;
        $this->data['csrf_token'] = $this->generateCsrf();
        
        $this->render('documents.pending', $this->data);
    }

    /**
     * Admin: Approve a document
     *
     * @param string $id
     * @return void
     */
    public function approve(string $id): void
    {
        RbacMiddleware::requirePermission('manage_documents');
        
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }
        
        $documentId = (int)$id;
        $adminId = $this->getUserId();
        
        $document = $this->documentModel->getDocument($documentId);
        
        if ($document === null) {
            $this->json(['error' => 'Document not found'], 404);
            return;
        }
        
        $result = $this->documentModel->approve($documentId, $adminId);
        
        if (!$result) {
            $this->json(['error' => 'Failed to approve document'], 500);
            return;
        }
        
        // Check if all documents for this user are now approved
        if ($this->documentModel->hasAllDocumentsApproved($document['user_id'])) {
            $this->userModel->approveDocuments($document['user_id'], $adminId);
        }
        
        $this->json(['success' => true, 'message' => 'Document approved']);
    }

    /**
     * Admin: Reject a document
     *
     * @param string $id
     * @return void
     */
    public function reject(string $id): void
    {
        RbacMiddleware::requirePermission('manage_documents');
        
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }
        
        $documentId = (int)$id;
        $adminId = $this->getUserId();
        $reason = $this->post('rejection_reason') ?? '';
        
        if (empty($reason)) {
            $this->json(['error' => 'Rejection reason is required'], 422);
            return;
        }
        
        $document = $this->documentModel->getDocument($documentId);
        
        if ($document === null) {
            $this->json(['error' => 'Document not found'], 404);
            return;
        }
        
        $result = $this->documentModel->reject($documentId, $adminId, $reason);
        
        if (!$result) {
            $this->json(['error' => 'Failed to reject document'], 500);
            return;
        }
        
        // Update user document status to rejected
        $this->userModel->rejectDocuments($document['user_id'], $adminId, $reason);
        
        $this->json(['success' => true, 'message' => 'Document rejected']);
    }

    /**
     * Validate document file
     *
     * @param array $file
     * @return string|true
     */
    private function validateDocumentFile(array $file): string|bool
    {
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return 'File upload error: ' . $file['error'];
        }
        
        // Check file size
        if ($file['size'] > MAX_FILE_SIZE) {
            return 'File size exceeds maximum allowed size (10MB)';
        }
        
        // Check MIME type
        $allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
        ];
        
        $mime = $file['type'];
        if (!in_array($mime, $allowedMimes)) {
            return 'File type not allowed. Allowed: PDF, JPEG, PNG, GIF';
        }
        
        // Check extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif'];
        if (!in_array($extension, $allowedExtensions)) {
            return 'File extension not allowed';
        }
        
        return true;
    }

    /**
     * Store document file on server
     *
     * @param array $file
     * @param int $userId
     * @param int|null $playerId
     * @param string $documentType
     * @return array
     */
    private function storeDocumentFile(array $file, int $userId, ?int $playerId, string $documentType): array
    {
        // Create uploads directory if it doesn't exist
        $uploadDir = DOCS_UPLOAD_PATH . '/documents';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $storedFilename = uniqid('doc_' . $userId . '_', true) . '.' . $extension;
        $filePath = $uploadDir . '/' . $storedFilename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            return ['success' => false, 'error' => 'Failed to move uploaded file'];
        }
        
        // Set proper permissions
        chmod($filePath, 0644);
        
        return [
            'success' => true,
            'file_path' => $filePath,
            'original_filename' => SecurityHelper::sanitizeFilename($file['name']),
            'stored_filename' => $storedFilename,
            'mime_type' => $file['type'],
            'file_size' => $file['size'],
        ];
    }
}
