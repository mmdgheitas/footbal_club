<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\HomeworkVideo;
use App\Models\Classroom;
use App\Models\Player;
use App\Middleware\AuthMiddleware;
use App\Middleware\RbacMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Homework Controller
 * Handles student homework video submissions and coach reviews
 */
class HomeworkController extends Controller
{
    private HomeworkVideo $homeworkModel;
    private Classroom $classroomModel;
    private Player $playerModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->homeworkModel = new HomeworkVideo();
        $this->classroomModel = new Classroom();
        $this->playerModel = new Player();
    }

    /**
     * Show homework upload form for student
     *
     * @return void
     */
    public function upload(): void
    {
        AuthMiddleware::requireAuth();
        
        $userId = $this->getUserId();
        $user = AuthMiddleware::getUser();
        
        if ($user === null || ($user['role'] ?? '') !== 'player') {
            $this->redirect('/403');
        }
        
        // Get player info
        $playerId = $user['player_id'] ?? null;
        $player = null;
        if ($playerId) {
            $player = $this->playerModel->find($playerId);
        }
        
        // Get classrooms the player belongs to
        $classrooms = [];
        if ($player && !empty($player['classroom_id'])) {
            $classroom = $this->classroomModel->find((int)$player['classroom_id']);
            if ($classroom) {
                $classrooms[] = $classroom;
            }
        }
        
        // Get existing homework videos for this player
        $videos = $this->homeworkModel->getByPlayerId($playerId);
        
        $this->data['title'] = 'آپلود تمرین';
        $this->data['player'] = $player;
        $this->data['classrooms'] = $classrooms;
        $this->data['videos'] = $videos;
        $this->data['csrf_token'] = $this->generateCsrf();
        
        $this->render('homework.upload', $this->data);
    }

    /**
     * Handle homework video upload
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
        
        if ($user === null || ($user['role'] ?? '') !== 'player') {
            $this->json(['error' => 'Unauthorized'], 403);
            return;
        }
        
        $playerId = $user['player_id'] ?? null;
        if (!$playerId) {
            $this->json(['error' => 'Player profile not found'], 403);
            return;
        }
        
        $title = SecurityHelper::sanitizeString($this->post('title') ?? '');
        $description = SecurityHelper::sanitizeString($this->post('description') ?? '');
        $classroomId = $this->post('classroom_id') ? (int)$this->post('classroom_id') : null;
        
        if (empty($title)) {
            $this->json(['error' => 'Title is required'], 422);
            return;
        }
        
        if (empty($_FILES['video'])) {
            $this->json(['error' => 'No video file uploaded'], 422);
            return;
        }
        
        $file = $_FILES['video'];
        
        // Validate video file
        $validation = $this->validateVideoFile($file);
        if ($validation !== true) {
            $this->json(['error' => $validation], 422);
            return;
        }
        
        // Store the file
        $uploadResult = $this->storeVideoFile($file);
        
        if (!$uploadResult['success']) {
            $this->json(['error' => $uploadResult['error']], 500);
            return;
        }
        
        // Create homework video record
        $videoData = [
            'player_id' => $playerId,
            'user_id' => $userId,
            'classroom_id' => $classroomId,
            'title' => $title,
            'description' => $description,
            'video_path' => $uploadResult['file_path'],
            'original_filename' => $uploadResult['original_filename'],
            'stored_filename' => $uploadResult['stored_filename'],
            'mime_type' => $uploadResult['mime_type'],
            'file_size' => $uploadResult['file_size'],
            'duration_seconds' => $uploadResult['duration'] ?? null,
            'status' => 'submitted',
        ];
        
        $videoId = $this->homeworkModel->createVideo($videoData);
        
        if (!$videoId) {
            // Clean up uploaded file
            if (file_exists($uploadResult['file_path'])) {
                unlink($uploadResult['file_path']);
            }
            $this->json(['error' => 'Failed to save video record'], 500);
            return;
        }
        
        $this->json([
            'success' => true,
            'message' => 'Video uploaded successfully',
            'video_id' => $videoId,
            'redirect' => APP_URL . '/homework/upload',
        ]);
    }

    /**
     * Coach: List homework videos for review
     *
     * @return void
     */
    public function reviewList(): void
    {
        AuthMiddleware::requireAuth();
        
        $userId = $this->getUserId();
        $user = AuthMiddleware::getUser();
        
        if ($user === null || !in_array($user['role'] ?? '', ['coach', 'super_admin'])) {
            $this->redirect('/403');
        }
        
        // Get classrooms coached by this user
        $classrooms = $this->classroomModel->findAllBy('coach_id', (string)$userId);
        
        if (empty($classrooms)) {
            // If no classrooms assigned, show all pending videos
            $videos = $this->homeworkModel->getPending();
        } else {
            // Get videos from the coach's classrooms
            $videos = $this->homeworkModel->getByCoachId($userId);
        }
        
        $this->data['title'] = 'بررسی تمرینات';
        $this->data['videos'] = $videos;
        $this->data['csrf_token'] = $this->generateCsrf();
        
        $this->render('homework.review_list', $this->data);
    }

    /**
     * Coach: Review a homework video
     *
     * @param string $id
     * @return void
     */
    public function review(string $id): void
    {
        AuthMiddleware::requireAuth();
        
        $userId = $this->getUserId();
        $user = AuthMiddleware::getUser();
        
        if ($user === null || !in_array($user['role'] ?? '', ['coach', 'super_admin'])) {
            $this->redirect('/403');
        }
        
        $videoId = (int)$id;
        $video = $this->homeworkModel->getVideo($videoId);
        
        if ($video === null) {
            $this->redirect('/homework/review-list');
        }
        
        $this->data['title'] = 'بررسی ویدئو: ' . ($video['title'] ?? 'Unknown');
        $this->data['video'] = $video;
        $this->data['csrf_token'] = $this->generateCsrf();
        
        $this->render('homework.review', $this->data);
    }

    /**
     * Coach: Submit review for a homework video
     *
     * @param string $id
     * @return void
     */
    public function submitReview(string $id): void
    {
        AuthMiddleware::requireAuth();
        
        if (!$this->validateCsrf()) {
            $this->json(['error' => 'Invalid CSRF token'], 403);
            return;
        }
        
        $userId = $this->getUserId();
        $user = AuthMiddleware::getUser();
        
        if ($user === null || !in_array($user['role'] ?? '', ['coach', 'super_admin'])) {
            $this->json(['error' => 'Unauthorized'], 403);
            return;
        }
        
        $videoId = (int)$id;
        $feedback = SecurityHelper::sanitizeString($this->post('feedback') ?? '');
        $rating = $this->post('rating') ? (int)$this->post('rating') : null;
        
        if (empty($feedback)) {
            $this->json(['error' => 'Feedback is required'], 422);
            return;
        }
        
        $result = $this->homeworkModel->review($videoId, $userId, $feedback, $rating);
        
        if (!$result) {
            $this->json(['error' => 'Failed to save review'], 500);
            return;
        }
        
        $this->json([
            'success' => true,
            'message' => 'Review submitted successfully',
            'redirect' => APP_URL . '/homework/review-list',
        ]);
    }

    /**
     * Validate video file
     *
     * @param array $file
     * @return string|true
     */
    private function validateVideoFile(array $file): string|bool
    {
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return 'File upload error: ' . $file['error'];
        }
        
        // Check file size (50MB max for videos)
        $maxVideoSize = 50 * 1024 * 1024;
        if ($file['size'] > $maxVideoSize) {
            return 'Video size exceeds maximum allowed size (50MB)';
        }
        
        // Check MIME type for video
        $allowedMimes = [
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-flv',
        ];
        
        $mime = $file['type'];
        if (!in_array($mime, $allowedMimes)) {
            return 'File type not allowed. Allowed: MP4, WebM, MOV, AVI, FLV';
        }
        
        // Check extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExtensions = ['mp4', 'webm', 'mov', 'avi', 'flv', 'mkv'];
        if (!in_array($extension, $allowedExtensions)) {
            return 'File extension not allowed';
        }
        
        return true;
    }

    /**
     * Store video file on server
     *
     * @param array $file
     * @return array
     */
    private function storeVideoFile(array $file): array
    {
        // Create uploads directory if it doesn't exist
        $uploadDir = PLAYER_UPLOAD_PATH . '/homework';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $storedFilename = uniqid('hw_' . date('Ymd') . '_', true) . '.' . $extension;
        $filePath = $uploadDir . '/' . $storedFilename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            return ['success' => false, 'error' => 'Failed to move uploaded file'];
        }
        
        // Set proper permissions
        chmod($filePath, 0644);
        
        // Try to get video duration (optional)
        $duration = null;
        if (function_exists('shell_exec')) {
            $output = shell_exec('ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "' . escapeshellarg($filePath) . '" 2>&1');
            if (is_numeric(trim($output ?? ''))) {
                $duration = (int)trim($output);
            }
        }
        
        return [
            'success' => true,
            'file_path' => $filePath,
            'original_filename' => SecurityHelper::sanitizeFilename($file['name']),
            'stored_filename' => $storedFilename,
            'mime_type' => $file['type'],
            'file_size' => $file['size'],
            'duration' => $duration,
        ];
    }
}
