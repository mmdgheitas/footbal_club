<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * FileUpload Model
 * PSR-12 compliant - Handles secure file uploads
 */
class FileUpload extends Model
{
    protected string $table = 'fc_file_uploads';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'player_id',
        'file_type',
        'original_filename',
        'stored_filename',
        'file_path',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    /**
     * Get files for player
     *
     * @param int $playerId Player ID
     * @return array
     */
    public function getByPlayerId(int $playerId): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? AND deleted_at IS NULL ORDER BY created_at DESC";
        return $this->db->findAll($query, [$playerId]);
    }

    /**
     * Get files for player by type
     *
     * @param int $playerId Player ID
     * @param string $fileType File type
     * @return array
     */
    public function getByPlayerAndType(int $playerId, string $fileType): array
    {
        $query = "SELECT * FROM {$this->table} WHERE player_id = ? AND file_type = ? AND deleted_at IS NULL";
        return $this->db->findAll($query, [$playerId, $fileType]);
    }

    /**
     * Validate file for upload
     *
     * @param array $file Uploaded file
     * @return array ['valid' => bool, 'error' => string|null]
     */
    public function validateFile(array $file): array
    {
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return [
                'valid' => false,
                'error' => $this->getUploadErrorMessage($file['error']),
            ];
        }

        // Check file size
        if ($file['size'] > MAX_FILE_SIZE) {
            return [
                'valid' => false,
                'error' => 'File size exceeds maximum allowed size of ' . (MAX_FILE_SIZE / 1024 / 1024) . ' MB',
            ];
        }

        // Get file extension
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        // Check allowed extensions
        if (!in_array($ext, ALLOWED_UPLOAD_EXTENSIONS, true)) {
            return [
                'valid' => false,
                'error' => 'File type not allowed. Allowed types: ' . implode(', ', ALLOWED_UPLOAD_EXTENSIONS),
            ];
        }

        // Check MIME type
        $mimeType = mime_content_type($file['tmp_name']);
        if ($mimeType !== false && !in_array($mimeType, ALLOWED_MIME_TYPES, true)) {
            return [
                'valid' => false,
                'error' => 'File MIME type not allowed',
            ];
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Get upload error message
     *
     * @param int $errorCode PHP upload error code
     * @return string
     */
    private function getUploadErrorMessage(int $errorCode): string
    {
        return match ($errorCode) {
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize in php.ini',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE in HTML form',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload',
            default => 'Unknown upload error',
        };
    }

    /**
     * Store uploaded file
     *
     * @param array $file Uploaded file
     * @param int $playerId Player ID
     * @param string $fileType File type
     * @param int $userId User ID
     * @return int|false File upload ID or false on failure
     */
    public function storeFile(array $file, int $playerId, string $fileType, int $userId): int|false
    {
        // Validate file
        $validation = $this->validateFile($file);
        if (!$validation['valid']) {
            return false;
        }

        // Generate unique filename using UUID
        $uuid = $this->generateUuid();
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $storedFilename = $uuid . '.' . $ext;

        // Determine upload directory
        if ($fileType === 'national_id' || $fileType === 'medical_clearance' || $fileType === 'insurance') {
            $uploadDir = PLAYER_UPLOAD_PATH;
        } else {
            $uploadDir = DOCS_UPLOAD_PATH;
        }

        // Create upload directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filePath = $uploadDir . DIRECTORY_SEPARATOR . $storedFilename;

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            return false;
        }

        // Set proper file permissions
        chmod($filePath, 0644);

        // Store file record in database
        $mimeType = mime_content_type($filePath);

        return $this->insert([
            'uuid' => $uuid,
            'player_id' => $playerId,
            'file_type' => $fileType,
            'original_filename' => basename($file['name']),
            'stored_filename' => $storedFilename,
            'file_path' => str_replace(PUBLIC_PATH, '', $filePath),
            'mime_type' => $mimeType ?: 'application/octet-stream',
            'file_size' => $file['size'],
            'uploaded_by' => $userId,
        ]);
    }

    /**
     * Delete file from storage
     *
     * @param int $fileId File ID
     * @return bool
     */
    public function deleteFile(int $fileId): bool
    {
        $file = $this->find($fileId);

        if ($file === null) {
            return false;
        }

        // Delete physical file
        $filePath = PUBLIC_PATH . $file['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        // Soft delete from database
        return $this->softDelete($fileId);
    }

    /**
     * Get file for download
     *
     * @param int $fileId File ID
     * @return array|null
     */
    public function getForDownload(int $fileId): ?array
    {
        $query = "SELECT * FROM {$this->table} WHERE id = ? AND deleted_at IS NULL";
        return $this->db->findOne($query, [$fileId]);
    }

    /**
     * Create file upload record
     *
     * @param array $data File data
     * @return int|false
     */
    public function createFile(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
        return $this->insert($data);
    }

    /**
     * Generate UUID
     *
     * @return string
     */
    private function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Soft delete file record
     *
     * @param int $id File ID
     * @return bool
     */
    public function softDelete(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
    }
}
