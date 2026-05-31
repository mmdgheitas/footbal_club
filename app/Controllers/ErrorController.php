<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Helpers\ErrorResponse;
use App\Helpers\SecurityHelper;

/**
 * HTTP error pages (403, 404)
 */
class ErrorController extends Controller
{
    protected function checkAuth(): void
    {
        // Error pages are reachable without forcing login redirect
    }

    protected function isPublicRoute(): bool
    {
        return true;
    }

    /**
     * Display custom 403 page
     */
    public function forbidden(): void
    {
        $message = SecurityHelper::sanitizeString($this->get('message') ?? '')
            ?: 'شما مجوز دسترسی به این بخش را ندارید.';

        ErrorResponse::render(403, 'دسترسی غیرمجاز', $message);
    }

    /**
     * Display custom 404 page
     */
    public function notFound(): void
    {
        ErrorResponse::notFound();
    }
}
