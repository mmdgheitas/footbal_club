<?php
require 'config/config.php';
require 'app/Core/Database.php';
$db = \App\Core\Database::getInstance();
echo "--- fc_users ---\n";
print_r($db->findAll('DESCRIBE fc_users'));
echo "\n--- fc_players ---\n";
print_r($db->findAll('DESCRIBE fc_players'));
