<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\User;
use App\Middleware\AuthMiddleware;
use App\Helpers\SecurityHelper;

/**
 * Authentication Controller
 * PSR-12 compliant - Handles user login, registration, and logout
 */
class AuthController extends Controller
{
    protected string $layout = 'layouts.auth';
    private User $userModel;

    /**
     * Constructor
     */
    public function __construct()
    {
        $this->userModel = new User();
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

        $email = SecurityHelper::sanitizeString($this->post('email') ?? '');
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

        if ($user['status'] !== 1) {
            $this->flash('error', 'Your account has been disabled.');
            $this->redirect('/login');
        }

        // Login user
        AuthMiddleware::login($user['id'], $user['role'], $user);

        $this->flash('success', 'Welcome back, ' . $user['name'] . '!');
        $this->redirect('/dashboard');
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
     * Store new user
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

        $name = SecurityHelper::sanitizeString($this->post('name') ?? '');
        $email = SecurityHelper::sanitizeString($this->post('email') ?? '');
        $password = $this->post('password') ?? '';
        $confirmPassword = $this->post('password_confirmation') ?? '';

        // Validate inputs
        $errors = [];

        if (empty($name)) {
            $errors[] = 'Name is required.';
        }

        if (empty($email)) {
            $errors[] = 'Email is required.';
        } elseif (!SecurityHelper::validateEmail($email)) {
            $errors[] = 'Invalid email address.';
        } elseif ($this->userModel->findByEmail($email) !== null) {
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

        if (!empty($errors)) {
            foreach ($errors as $error) {
                $this->flash('error', $error);
            }
            $this->redirect('/register');
        }

        // Create user
        $userId = $this->userModel->createUser([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'role' => 'coach',
            'status' => 1,
        ]);

        if (!$userId) {
            $this->flash('error', 'Failed to create account. Please try again.');
            $this->redirect('/register');
        }

        $this->flash('success', 'Account created successfully! Please log in.');
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
