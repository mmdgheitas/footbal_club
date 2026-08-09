<?php

declare(strict_types=1);

namespace App\Core;

use App\Helpers\ErrorResponse;

/**
 * Application Core Class
 * Bootstraps and manages the Football Club Management System
 * PSR-12 compliant application kernel
 */
class App
{
    private static ?App $instance = null;
    private Router $router;
    private Database $database;
    private array $config = [];

    /**
     * Private constructor for singleton pattern
     */
    private function __construct()
    {
        $this->bootstrap();
    }

    /**
     * Get singleton instance
     *
     * @return App
     */
    public static function getInstance(): App
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Bootstrap the application
     *
     * @return void
     */
    private function bootstrap(): void
    {
        // Set error reporting
        error_reporting(E_ALL);
        ini_set('display_errors', APP_DEBUG ? '1' : '0');

        // Initialize components
        $this->router = new Router();
        $this->database = Database::getInstance();

        // Register routes
        $this->registerRoutes();
    }

    /**
     * Register application routes
     *
     * @return void
     */
    private function registerRoutes(): void
    {
        // Authentication Routes
        $this->router->get('/', 'AuthController', 'login');
        $this->router->get('/login', 'AuthController', 'login');
        $this->router->post('/login', 'AuthController', 'authenticate');
        $this->router->get('/logout', 'AuthController', 'logout');
        $this->router->get('/register', 'AuthController', 'register');
        $this->router->post('/register', 'AuthController', 'store');

        // Dashboard Routes
        $this->router->get('/dashboard', 'DashboardController', 'index');

        // Player Routes
        $this->router->get('/players', 'PlayerController', 'index');
        $this->router->get('/player/create', 'PlayerController', 'create');
        $this->router->post('/player/store', 'PlayerController', 'store');
        $this->router->get('/player/edit/{id}', 'PlayerController', 'edit');
        $this->router->post('/player/update/{id}', 'PlayerController', 'update');
        $this->router->get('/player/view/{id}', 'PlayerController', 'view');
        $this->router->post('/player/delete/{id}', 'PlayerController', 'delete');

        // Classroom Routes
        $this->router->get('/classrooms', 'ClassroomController', 'index');
        $this->router->get('/classroom/create', 'ClassroomController', 'create');
        $this->router->post('/classroom/store', 'ClassroomController', 'store');
        $this->router->get('/classroom/edit/{id}', 'ClassroomController', 'edit');
        $this->router->post('/classroom/update/{id}', 'ClassroomController', 'update');
        $this->router->get('/classroom/view/{id}', 'ClassroomController', 'view');
        $this->router->post('/classroom/delete/{id}', 'ClassroomController', 'delete');
        $this->router->post('/classroom/add-player/{id}', 'ClassroomController', 'addPlayer');
        $this->router->post('/classroom/remove-player/{id}', 'ClassroomController', 'removePlayer');

        // Financial Routes
        $this->router->get('/payments', 'FinancialController', 'index');
        $this->router->post('/payment/record', 'FinancialController', 'record');
        $this->router->get('/payment/receipt/{id}', 'FinancialController', 'generateReceipt');
        $this->router->get('/reports/financial', 'FinancialController', 'report');
        $this->router->get('/reports/debts', 'FinancialController', 'debtReport');

        // Attendance Routes
        $this->router->get('/attendance', 'AttendanceController', 'index');
        $this->router->post('/attendance/mark', 'AttendanceController', 'mark');
        $this->router->get('/attendance/report/{id}', 'AttendanceController', 'playerReport');

        // Medical Routes
        $this->router->get('/medical', 'MedicalController', 'index');
        $this->router->get('/medical/view/{id}', 'MedicalController', 'view');
        $this->router->post('/medical/update/{id}', 'MedicalController', 'update');

        // SMS Routes
        $this->router->get('/sms/send', 'SmsController', 'index');
        $this->router->post('/sms/send', 'SmsController', 'send');
        $this->router->get('/sms/logs', 'SmsController', 'logs');

        // Admin Routes
        $this->router->get('/admin/users', 'AdminController', 'users');
        $this->router->get('/admin/settings', 'AdminController', 'settings');
        $this->router->post('/admin/settings', 'AdminController', 'updateSettings');

        // Player Panel Routes
        $this->router->get('/player-panel', 'PlayerPanelController', 'index');
        $this->router->get('/player-panel/financial', 'PlayerPanelController', 'financial');
        $this->router->get('/player-panel/attendance', 'PlayerPanelController', 'attendance');
        $this->router->get('/player-panel/profile', 'PlayerPanelController', 'profile');
        $this->router->get('/player-panel/alerts', 'PlayerPanelController', 'alerts');
        $this->router->get('/player-panel/achievements', 'PlayerPanelController', 'achievements');
        $this->router->get('/player-panel/case-notes', 'PlayerPanelController', 'caseNotes');
        $this->router->get('/player-panel/homework', 'PlayerPanelController', 'homework');

        // Document Routes
        $this->router->get('/documents/upload', 'DocumentController', 'upload');
        $this->router->post('/documents/store', 'DocumentController', 'store');
        $this->router->get('/admin/documents/pending', 'DocumentController', 'pending');
        $this->router->post('/admin/documents/approve/{id}', 'DocumentController', 'approve');
        $this->router->post('/admin/documents/reject/{id}', 'DocumentController', 'reject');

        // Homework Routes
        $this->router->get('/homework/upload', 'HomeworkController', 'upload');
        $this->router->post('/homework/store', 'HomeworkController', 'store');
        $this->router->get('/homework/review-list', 'HomeworkController', 'reviewList');
        $this->router->get('/homework/review/{id}', 'HomeworkController', 'review');
        $this->router->post('/homework/submit-review/{id}', 'HomeworkController', 'submitReview');

        // Achievement Routes
        $this->router->get('/achievements', 'AchievementController', 'index');
        $this->router->get('/achievements/create', 'AchievementController', 'create');
        $this->router->post('/achievements/store', 'AchievementController', 'store');
        $this->router->get('/achievements/edit/{id}', 'AchievementController', 'edit');
        $this->router->post('/achievements/update/{id}', 'AchievementController', 'update');
        $this->router->post('/achievements/delete/{id}', 'AchievementController', 'delete');
        $this->router->post('/achievements/toggle-publish/{id}', 'AchievementController', 'togglePublish');

        // Case Note Routes
        $this->router->get('/case-notes', 'CaseNoteController', 'index');
        $this->router->get('/case-notes/create', 'CaseNoteController', 'create');
        $this->router->post('/case-notes/store', 'CaseNoteController', 'store');
        $this->router->get('/case-notes/edit/{id}', 'CaseNoteController', 'edit');
        $this->router->post('/case-notes/update/{id}', 'CaseNoteController', 'update');
        $this->router->post('/case-notes/delete/{id}', 'CaseNoteController', 'delete');
        $this->router->post('/case-notes/toggle-visibility/{id}', 'CaseNoteController', 'toggleVisibility');

        // Alert Routes
        $this->router->get('/admin/alerts', 'AlertController', 'index');
        $this->router->post('/admin/alerts/create', 'AlertController', 'create');
        $this->router->post('/admin/alerts/delete/{id}', 'AlertController', 'delete');
        $this->router->get('/my-alerts', 'AlertController', 'myAlerts');

        // Error pages
        $this->router->get('/403', 'ErrorController', 'forbidden');
        $this->router->get('/404', 'ErrorController', 'notFound');
    }

    /**
     * Run the application
     *
     * @return void
     */
    public function run(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $this->normalizeRequestUri($_GET['_url'] ?? $_SERVER['REQUEST_URI'] ?? '/');

        try {
            if (!$this->router->dispatch($method, $uri)) {
                ErrorResponse::notFound();
            }
        } catch (\Exception $e) {
            http_response_code(500);
            if (APP_DEBUG) {
                $this->renderError('500 - Server Error: ' . $e->getMessage());
            } else {
                $this->renderError('500 - Server Error');
            }
        }
    }

    /**
     * Strip subdirectory base path from request URI for routing.
     */
    private function normalizeRequestUri(string $uri): string
    {
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';
        $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));

        if ($scriptDir !== '/' && $scriptDir !== '' && str_starts_with($path, $scriptDir)) {
            $path = substr($path, strlen($scriptDir)) ?: '/';
        }

        return $path;
    }

    /**
     * Render simple 500 error page
     */
    private function renderError(string $message): void
    {
        header('Content-Type: text/html; charset=utf-8');
        $home = defined('APP_URL') ? APP_URL . '/dashboard' : '/';
        $safeMessage = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        $safeHome = htmlspecialchars($home, ENT_QUOTES, 'UTF-8');
        echo <<<HTML
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head><meta charset="UTF-8"><title>خطا</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px;">
            <h1>{$safeMessage}</h1>
            <p><a href="{$safeHome}">بازگشت</a></p>
        </body>
        </html>
        HTML;
    }

    /**
     * Get router instance
     *
     * @return Router
     */
    public function getRouter(): Router
    {
        return $this->router;
    }

    /**
     * Get database instance
     *
     * @return Database
     */
    public function getDatabase(): Database
    {
        return $this->database;
    }

    /**
     * Prevent cloning
     *
     * @return void
     */
    private function __clone(): void
    {
    }

    /**
     * Prevent unserialization
     *
     * @return void
     */
    public function __wakeup(): void
    {
    }
}
