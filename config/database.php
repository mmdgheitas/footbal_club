<?php

declare(strict_types=1);

/**
 * Database Configuration File
 * PDO Connection settings and database credentials
 */

return [
    'default' => $_ENV['DB_CONNECTION'] ?? 'mysql',

    'connections' => [
        'mysql' => [
            'driver' => 'mysql',
            'host' => $_ENV['DB_HOST'] ?? 'localhost',
            'port' => $_ENV['DB_PORT'] ?? 3306,
            'database' => $_ENV['DB_NAME'] ?? 'football_club',
            'username' => $_ENV['DB_USER'] ?? 'root',
            'password' => $_ENV['DB_PASSWORD'] ?? '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => 'fc_',
            'strict' => true,
            'engine' => 'InnoDB',
        ],

        'sqlite' => [
            'driver' => 'sqlite',
            'database' => BASE_PATH . '/database/football_club.db',
            'prefix' => 'fc_',
        ],
    ],

    'migrations' => 'migrations',
    'seeders' => 'seeders',
];
