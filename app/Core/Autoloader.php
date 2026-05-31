<?php

declare(strict_types=1);

namespace App\Core;

/**
 * PSR-4 Autoloader for the Football Club Management System
 * Dynamically loads classes based on namespace and file structure
 */
class Autoloader
{
    /**
     * Register the autoloader
     *
     * @return void
     */
    public static function register(): void
    {
        spl_autoload_register([self::class, 'load']);
    }

    /**
     * Load a class from its namespace
     *
     * @param string $class Fully qualified class name
     * @return bool
     */
    public static function load(string $class): bool
    {
        // Project namespace prefix
        $prefix = 'App\\';

        // If the class doesn't use the project namespace, exit
        if (strpos($class, $prefix) !== 0) {
            return false;
        }

        // Remove the prefix and convert to file path
        $relativeClass = substr($class, strlen($prefix));
        $file = APP_PATH . DIRECTORY_SEPARATOR . str_replace('\\', DIRECTORY_SEPARATOR, $relativeClass) . '.php';

        // Check if the file exists
        if (file_exists($file)) {
            require_once $file;
            return true;
        }

        return false;
    }
}
