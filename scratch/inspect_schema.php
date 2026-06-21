<?php

define('BASE_PATH', dirname(__DIR__));
define('APP_PATH', BASE_PATH . '/app');
define('CONFIG_PATH', BASE_PATH . '/config');

require_once APP_PATH . '/Core/Autoloader.php';
\App\Core\Autoloader::register();

use App\Core\Database;

try {
    $db = Database::getInstance();
    $pdo = $db->getConnection();
    
    // Inspect fc_alerts table
    $stmt = $pdo->query("DESCRIBE fc_alerts");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "fc_alerts columns:\n";
    print_r($columns);
    
} catch (\Exception $e) {
    echo "Error inspecting database: " . $e->getMessage() . "\n";
}
