<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Router Class - Handles URL routing and dispatching
 * PSR-12 compliant - Maps URLs to controllers and actions
 */
class Router
{
    private array $routes = [];
    private string $currentRoute = '';
    private array $routeParams = [];

    /**
     * Register a GET route
     *
     * @param string $pattern Route pattern (e.g., '/player/edit/{id}')
     * @param string $controller Controller class
     * @param string $action Action method
     * @return void
     */
    public function get(string $pattern, string $controller, string $action): void
    {
        $this->addRoute('GET', $pattern, $controller, $action);
    }

    /**
     * Register a POST route
     *
     * @param string $pattern Route pattern
     * @param string $controller Controller class
     * @param string $action Action method
     * @return void
     */
    public function post(string $pattern, string $controller, string $action): void
    {
        $this->addRoute('POST', $pattern, $controller, $action);
    }

    /**
     * Register a PUT route
     *
     * @param string $pattern Route pattern
     * @param string $controller Controller class
     * @param string $action Action method
     * @return void
     */
    public function put(string $pattern, string $controller, string $action): void
    {
        $this->addRoute('PUT', $pattern, $controller, $action);
    }

    /**
     * Register a DELETE route
     *
     * @param string $pattern Route pattern
     * @param string $controller Controller class
     * @param string $action Action method
     * @return void
     */
    public function delete(string $pattern, string $controller, string $action): void
    {
        $this->addRoute('DELETE', $pattern, $controller, $action);
    }

    /**
     * Add a route to the routing table
     *
     * @param string $method HTTP method
     * @param string $pattern Route pattern
     * @param string $controller Controller class
     * @param string $action Action method
     * @return void
     */
    private function addRoute(string $method, string $pattern, string $controller, string $action): void
    {
        $key = strtoupper($method) . ':' . $pattern;
        $this->routes[$key] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'controller' => $controller,
            'action' => $action,
        ];
    }

    /**
     * Match and dispatch a request
     *
     * @param string $method HTTP method
     * @param string $uri Request URI
     * @return bool
     */
    public function dispatch(string $method, string $uri): bool
    {
        $method = strtoupper($method);
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';
        $uri = '/' . trim($path, '/');
        $matches = [];
        // Try to match the URI to a route
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if ($this->matchRoute($route['pattern'], $uri, $matches)) {
                $this->currentRoute = $route['pattern'];
                $this->routeParams = $matches;

                // Dispatch the controller
                return $this->executeController($route['controller'], $route['action'], $matches);
            }
        }

        return false;
    }

    /**
     * Match a route pattern against a URI
     *
     * @param string $pattern Route pattern
     * @param string $uri Request URI
     * @param array &$matches Captured parameters
     * @return bool
     */
    private function matchRoute(string $pattern, string $uri, array &$matches): bool
    {
        $matches = [];

        // Convert route pattern to regex
        $pattern = preg_replace_callback(
            '/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/',
            static function ($m) {
                return '(?<' . $m[1] . '>[^/]+)';
            },
            $pattern
        );

        $regex = '/^' . str_replace('/', '\/', $pattern) . '$/';

        if (preg_match($regex, $uri, $matches)) {
            // Remove numeric keys from matches
            foreach ($matches as $key => $value) {
                if (is_numeric($key)) {
                    unset($matches[$key]);
                }
            }
            return true;
        }

        return false;
    }

    /**
     * Execute a controller action
     *
     * @param string $controller Controller class name
     * @param string $action Action method name
     * @param array $params Route parameters
     * @return bool
     */
    private function executeController(string $controller, string $action, array $params = []): bool
    {
        try {
            $controllerClass = 'App\\Controllers\\' . $controller;

            if (!class_exists($controllerClass)) {
                return false;
            }

            $controllerInstance = new $controllerClass();
            $actionMethod = $action;

            if (!method_exists($controllerInstance, $actionMethod)) {
                return false;
            }

            // Call the action with route parameters
            call_user_func_array([$controllerInstance, $actionMethod], $params);
            return true;
        } catch (\Exception $e) {
            if (APP_DEBUG) {
                echo "Error: " . $e->getMessage();
            }
            return false;
        }
    }

    /**
     * Get current matched route
     *
     * @return string
     */
    public function getCurrentRoute(): string
    {
        return $this->currentRoute;
    }

    /**
     * Get route parameters
     *
     * @return array
     */
    public function getRouteParams(): array
    {
        return $this->routeParams;
    }
}
