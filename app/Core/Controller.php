<?php

declare(strict_types=1);

namespace App\Core;

/**
 * BaseController - Parent class for all controllers
 * PSR-12 compliant - Handles common controller logic
 */
abstract class Controller
{
    protected Database $db;
    protected array $data = [];
    protected string $viewPath = '';
    protected string $layout = 'layouts.main';

    /**
     * Constructor - Initialize controller dependencies
     */
    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->checkAuth();
    }

    /**
     * Check if user is authenticated
     * Can be overridden by child controllers
     *
     * @return void
     */
    protected function checkAuth(): void
    {
        if (!$this->isAuthenticated() && !$this->isPublicRoute()) {
            $this->redirect('/login');
        }
    }

    /**
     * Check if user is authenticated
     *
     * @return bool
     */
    protected function isAuthenticated(): bool
    {
        return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
    }

    /**
     * Get authenticated user ID
     *
     * @return int|null
     */
    protected function getUserId(): ?int
    {
        return $_SESSION['user_id'] ?? null;
    }

    /**
     * Get authenticated user role
     *
     * @return string|null
     */
    protected function getUserRole(): ?string
    {
        return $_SESSION['user_role'] ?? null;
    }

    /**
     * Get authenticated user data
     *
     * @return array|null
     */
    protected function getUser(): ?array
    {
        return $_SESSION['user'] ?? null;
    }

    /**
     * Check if route is public (no authentication required)
     *
     * @return bool
     */
    protected function isPublicRoute(): bool
    {
        $publicRoutes = ['/login', '/register', '/', '/403', '/404'];
        $currentUri = $this->getCurrentPath();
        return in_array($currentUri, $publicRoutes, true);
    }

    /**
     * Current request path without application base directory.
     */
    protected function getCurrentPath(): string
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
        $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));

        if ($scriptDir !== '/' && $scriptDir !== '' && str_starts_with($path, $scriptDir)) {
            $path = substr($path, strlen($scriptDir)) ?: '/';
        }

        return $path;
    }

    /**
     * Render a view with data
     *
     * @param string $view View file path (without .php)
     * @param array $data Data to pass to view
     * @return void
     */
    protected function render(string $view, array $data = []): void
    {
        $this->data = array_merge($this->data, $data);
        $viewFile = APP_PATH . '/Views/' . str_replace('.', '/', $view) . '.php';

        if (!file_exists($viewFile)) {
            throw new \Exception("View file not found: {$viewFile}");
        }

        // Extract data to local scope
        extract($this->data);

        // Buffer output
        ob_start();
        require $viewFile;
        $content = ob_get_clean();

        // Render layout
        $this->renderLayout($content);
    }

    /**
     * Render layout with content
     *
     * @param string $content Main content
     * @return void
     */
    protected function renderLayout(string $content): void
    {
        $layoutFile = APP_PATH . '/Views/' . str_replace('.', '/', $this->layout) . '.php';

        if (!file_exists($layoutFile)) {
            echo $content;
            return;
        }

        $this->data['user'] = $this->getUser();
        $this->data['userRole'] = $this->getUserRole();
        $this->data['flashes'] = $this->getFlashes();
        $this->data['content'] = $content;

        extract($this->data);
        require $layoutFile;
    }

    /**
     * Return JSON response
     *
     * @param array $data Response data
     * @param int $statusCode HTTP status code
     * @return void
     */
    protected function json(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Redirect to a URL
     *
     * @param string $url Redirect URL
     * @return void
     */
    protected function redirect(string $url): void
    {
        if (str_starts_with($url, '/') && defined('APP_URL')) {
            $url = APP_URL . $url;
        }
        header('Location: ' . $url);
        exit;
    }

    /**
     * Get POST data
     *
     * @param string|null $key Optional key to get specific value
     * @return array|string|null
     */
    protected function post(?string $key = null): array|string|null
    {
        if ($key === null) {
            return $_POST;
        }
        return $_POST[$key] ?? null;
    }

    /**
     * Get GET data
     *
     * @param string|null $key Optional key to get specific value
     * @return array|string|null
     */
    protected function get(?string $key = null): array|string|null
    {
        if ($key === null) {
            return $_GET;
        }
        return $_GET[$key] ?? null;
    }

    /**
     * Get REQUEST data (GET + POST)
     *
     * @param string|null $key Optional key to get specific value
     * @return array|string|null
     */
    protected function request(?string $key = null): array|string|null
    {
        $merged = array_merge($_GET, $_POST);
        if ($key === null) {
            return $merged;
        }
        return $merged[$key] ?? null;
    }

    /**
     * Get uploaded file
     *
     * @param string $name File input name
     * @return array|null
     */
    protected function file(string $name): ?array
    {
        return $_FILES[$name] ?? null;
    }

    /**
     * Set session value
     *
     * @param string $key Session key
     * @param mixed $value Session value
     * @return void
     */
    protected function setSession(string $key, mixed $value): void
    {
        $_SESSION[$key] = $value;
    }

    /**
     * Get session value
     *
     * @param string $key Session key
     * @return mixed
     */
    protected function getSession(string $key): mixed
    {
        return $_SESSION[$key] ?? null;
    }

    /**
     * Delete session value
     *
     * @param string $key Session key
     * @return void
     */
    protected function deleteSession(string $key): void
    {
        unset($_SESSION[$key]);
    }

    /**
     * Flash a message to session
     *
     * @param string $type Message type (success, error, warning, info)
     * @param string $message Message text
     * @return void
     */
    protected function flash(string $type, string $message): void
    {
        $_SESSION['flash'][$type][] = $message;
    }

    /**
     * Get and clear flash messages
     *
     * @return array
     */
    protected function getFlashes(): array
    {
        $flashes = $_SESSION['flash'] ?? [];
        unset($_SESSION['flash']);
        return $flashes;
    }

    /**
     * Validate CSRF token
     *
     * @return bool
     */
    protected function validateCsrf(): bool
    {
        $token = $_POST['_csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        $sessionToken = $_SESSION['_csrf_token'] ?? null;

        if ($token === null || $sessionToken === null || !hash_equals($token, $sessionToken)) {
            return false;
        }

        return true;
    }

    /**
     * Generate CSRF token
     *
     * @return string
     */
    protected function generateCsrf(): string
    {
        if (empty($_SESSION['_csrf_token'])) {
            $_SESSION['_csrf_token'] = bin2hex(random_bytes(CSRF_TOKEN_LENGTH / 2));
        }
        return $_SESSION['_csrf_token'];
    }

    /**
     * Check if user has permission for action
     *
     * @param string $action Action name
     * @return bool
     */
    protected function hasPermission(string $action): bool
    {
        $role = $this->getUserRole();
        if ($role === 'super_admin') {
            return true;
        }

        // Define role-based permissions
        $permissions = [
            'coach' => ['view_players', 'mark_attendance', 'view_medical'],
            'accountant' => ['view_payments', 'record_payment', 'generate_reports'],
            'secretary' => ['view_players', 'manage_players', 'view_payments'],
        ];

        return in_array($action, $permissions[$role] ?? [], true);
    }
}
