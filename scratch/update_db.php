<?php
/**
 * Database update runner script
 */
define('BASE_PATH', dirname(__DIR__));
define('APP_PATH', BASE_PATH . '/app');
define('CONFIG_PATH', BASE_PATH . '/config');

// Load environment variables
$envFile = BASE_PATH . '/.env';
if (is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value, " \t\n\r\0\x0B\"'");
    }
}

// Load autoloader
require_once APP_PATH . '/Core/Autoloader.php';
\App\Core\Autoloader::register();

use App\Core\Database;

try {
    $db = Database::getInstance();
    $sqlFile = BASE_PATH . '/database/update_schema.sql';
    if (!file_exists($sqlFile)) {
        throw new \Exception("SQL file not found at: {$sqlFile}");
    }
    
    $sql = file_get_contents($sqlFile);
    $pdo = $db->getConnection();
    
    // Run the SQL script
    $pdo->exec($sql);
    echo "Database schema updated successfully!\n";
} catch (\Exception $e) {
    echo "Error updating database: " . $e->getMessage() . "\n";
    exit(1);
}
