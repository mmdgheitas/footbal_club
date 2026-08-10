<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\User;
use App\Models\Player;
use App\Middleware\AuthMiddleware;
use App\Helpers\SecurityHelper;
use App\Helpers\JalaliHelper;

/**
 * Authentication Controller
 * Handles user login, registration, and logout
 */
class AuthController extends Controller
{
    protected string $layout = 'layouts.auth';
    private User $userModel;
    private Player $playerModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->userModel = new User();
        $this->playerModel = new Player();
    }

    /**
     * Show login form
     *
     * @return void
     */
    public function login(): void
    {
        AuthMiddleware::requireGuest();

        $this->data['title'] = 'Login';
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('auth.login', $this->data);
    }

    /**
     * Authenticate user
     *
     * @return void
     */
    public function authenticate(): void
    {
        AuthMiddleware::requireGuest();

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('/login');
        }

        // Validate CSRF token
        if (!$this->validateCsrf()) {
            $this->flash('error', 'Invalid security token. Please try again.');
            $this->redirect('/login');
        }

        $email = trim($this->post('email') ?? '');
        $password = $this->post('password') ?? '';

        // Validate inputs
        if (empty($email) || empty($password)) {
            $this->flash('error', 'Email and password are required.');
            $this->redirect('/login');
        }

        if (!SecurityHelper::validateEmail($email)) {
            $this->flash('error', 'Invalid email address.');
            $this->redirect('/login');
        }

        // Authenticate user
        $user = $this->userModel->authenticate($email, $password);

        if ($user === null) {
            $this->flash('error', 'Invalid email or password.');
            $this->redirect('/login');
        }

        if ((int)$user['status'] !== 1) {
            $this->flash('error', 'Your account has been disabled.');
            $this->redirect('/login');
        }

        // Check if player's documents are approved
        if ($user['role'] === 'player' && $user['document_status'] !== 'approved') {
            $this->flash('error', 'اسناد شما هنوز تأیید نشده است. لطفاً منتظر بمانید یا اسناد را آپلود کنید.');
            $this->redirect('/login');
        }

        // Regenerate session ID to prevent session fixation
        session_regenerate_id(true);

        // Login user
        AuthMiddleware::login($user['id'], $user['role'], $user);

        $this->flash('success', 'Welcome back, ' . $user['name'] . '!');
        
        if ($user['role'] === 'player') {
            $this->redirect('/player-panel');
        } else {
            $this->redirect('/dashboard');
        }
    }

    /**
     * Show registration form
     *
     * @return void
     */
    public function register(): void
    {
        AuthMiddleware::requireGuest();

        $this->data['title'] = 'Register';
        $this->data['csrf_token'] = $this->generateCsrf();

        $this->render('auth.register', $this->data);
    }

    /**
     * Store new user (student registration)
     *
     * @return void
     */
    public function store(): void
    {
        AuthMiddleware::requireGuest();

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('/register');
        }

        // Validate CSRF token
        if (!$this->validateCsrf()) {
            $this->flash('error', 'Invalid security token. Please try again.');
            $this->redirect('/register');
        }

        $name = trim($this->post('name') ?? '');
        $email = trim($this->post('email') ?? '');
        $password = $this->post('password') ?? '';
        $confirmPassword = $this->post('password_confirmation') ?? '';
        
        // Player-specific fields
        $dateOfBirthJalali = trim($this->post('date_of_birth') ?? '');
        $nationalId = trim($this->post('national_id') ?? '');
        $phone = trim($this->post('phone') ?? '');
        $position = $this->post('position') ?? '';

        // Convert Jalali date to Gregorian
        $dateOfBirth = JalaliHelper::toGregorianString($dateOfBirthJalali);

        // Validate inputs
        $errors = [];

        if (empty($name)) {
            $errors[] = 'Name is required.';
        }

        if (empty($email)) {
            $errors[] = 'Email is required.';
        } elseif (!SecurityHelper::validateEmail($email)) {
            $errors[] = 'Invalid email address.';
        } elseif ($this->userModel->findActiveByEmail($email) !== null) {
            $errors[] = 'Email already registered.';
        }

        if (empty($password)) {
            $errors[] = 'Password is required.';
        } else {
            $validation = SecurityHelper::validatePasswordStrength($password);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($password !== $confirmPassword) {
            $errors[] = 'Passwords do not match.';
        }
        
        // Validate player-specific fields
        if (empty($dateOfBirthJalali)) {
            $errors[] = 'Date of birth is required.';
        } elseif (empty($dateOfBirth)) {
            $errors[] = 'Invalid date of birth format. Please use YYYY/MM/DD.';
        }
        
        if (empty($nationalId)) {
            $errors[] = 'National ID is required.';
        } elseif ($this->playerModel->findActiveByNationalId($nationalId) !== null) {
            $errors[] = 'National ID already registered.';
        }
        
        if (empty($position)) {
            $errors[] = 'Position is required.';
        } elseif (!array_key_exists($position, PLAYER_POSITIONS)) {
            $errors[] = 'Invalid position.';
        }

        if (!empty($errors)) {
            foreach ($errors as $error) {
                $this->flash('error', $error);
            }
            $this->redirect('/register');
        }

        // Create player and user inside a transaction
        $this->db->beginTransaction();
        try {
            $playerData = [
                'name' => $name,
                'date_of_birth' => $dateOfBirth,
                'national_id' => $nationalId,
                'position' => $position,
                'phone' => $phone,
                'email' => $email,
                'medical_clearance' => 0, // Not cleared until documents are approved
            ];

            $playerId = $this->playerModel->createPlayer($playerData);

            if (!$playerId) {
                $this->db->rollback();
                $this->flash('error', 'Failed to create player profile. Please try again.');
                $this->redirect('/register');
            }

            // Create user linked to player
            $userId = $this->userModel->createUser([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'phone' => $phone,
                'role' => 'player',
                'player_id' => $playerId,
                'status' => 0, // Inactive until documents are approved
                'document_status' => 'pending',
            ]);

            if (!$userId) {
                $this->db->rollback();
                $this->flash('error', 'Failed to create account. Please try again.');
                $this->redirect('/register');
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollback();
            $this->flash('error', 'An error occurred during registration. Please try again.');
            $this->redirect('/register');
        }

        $this->flash('success', 'Account created successfully! Please upload your documents for approval.');
        $this->redirect('/login');
    }

    /**
     * Logout user
     *
     * @return void
     */
    public function logout(): void
    {
        AuthMiddleware::logout();
        $this->flash('success', 'You have been logged out successfully.');
        $this->redirect('/login');
    }

    /**
     * Override parent checkAuth for public routes
     *
     * @return void
     */
    protected function checkAuth(): void
    {
        // Auth controller allows unauthenticated access
    }

    /**
     * Override parent isPublicRoute check
     *
     * @return bool
     */
    protected function isPublicRoute(): bool
    {
        return true;
    }
}
