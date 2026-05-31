<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;
use PDOStatement;

/**
 * Database Singleton Class
 * Handles PDO connections, queries, and transactions
 * PSR-12 compliant with OWASP SQL injection prevention
 */
class Database
{
    private static ?Database $instance = null;
    private ?PDO $connection = null;
    private array $config;

    /**
     * Private constructor for singleton pattern
     *
     * @param array $config Database configuration
     */
    private function __construct(array $config)
    {
        $this->config = $config;
        $this->connect();
    }

    /**
     * Get singleton instance
     *
     * @param array $config Database configuration
     * @return Database
     */
    public static function getInstance(array $config = []): Database
    {
        if (self::$instance === null) {
            $config = $config ?: (require CONFIG_PATH . '/database.php');
            $connConfig = $config['connections'][$config['default']];
            self::$instance = new self($connConfig);
        }
        return self::$instance;
    }

    /**
     * Establish database connection
     *
     * @return void
     * @throws PDOException
     */
    private function connect(): void
    {
        try {
            $driver = $this->config['driver'];

            if ($driver === 'sqlite') {
                $dsn = "sqlite:" . $this->config['database'];
                $this->connection = new PDO($dsn);
            } else {
                $host = $this->config['host'] ?? 'localhost';
                $port = $this->config['port'] ?? 3306;
                $database = $this->config['database'];
                $charset = $this->config['charset'] ?? 'utf8mb4';

                $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";

                $this->connection = new PDO(
                    $dsn,
                    $this->config['username'] ?? '',
                    $this->config['password'] ?? '',
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                        PDO::ATTR_PERSISTENT => false,
                    ]
                );
            }

            // Set additional options
            $this->connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->connection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new PDOException('Database connection failed: ' . $e->getMessage());
        }
    }

    /**
     * Get the PDO connection
     *
     * @return PDO
     */
    public function getConnection(): PDO
    {
        return $this->connection;
    }

    /**
     * Prepare and execute a query with bound parameters
     *
     * @param string $query SQL query with placeholders (?)
     * @param array $params Parameter values
     * @return PDOStatement
     * @throws PDOException
     */
    public function query(string $query, array $params = []): PDOStatement
    {
        try {
            $stmt = $this->connection->prepare($query);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new PDOException('Query execution failed: ' . $e->getMessage());
        }
    }

    /**
     * Fetch a single row
     *
     * @param string $query SQL query
     * @param array $params Parameters
     * @return array|null
     * @throws PDOException
     */
    public function findOne(string $query, array $params = []): ?array
    {
        $stmt = $this->query($query, $params);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Fetch multiple rows
     *
     * @param string $query SQL query
     * @param array $params Parameters
     * @return array
     * @throws PDOException
     */
    public function findAll(string $query, array $params = []): array
    {
        $stmt = $this->query($query, $params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Execute an insert, update, or delete query
     *
     * @param string $query SQL query
     * @param array $params Parameters
     * @return int Number of affected rows
     * @throws PDOException
     */
    public function execute(string $query, array $params = []): int
    {
        $stmt = $this->query($query, $params);
        return $stmt->rowCount();
    }

    /**
     * Get the last inserted ID
     *
     * @param string $name Sequence name (for some databases)
     * @return string
     */
    public function lastInsertId(string $name = ''): string
    {
        return $this->connection->lastInsertId($name);
    }

    /**
     * Begin a database transaction
     *
     * @return bool
     */
    public function beginTransaction(): bool
    {
        return $this->connection->beginTransaction();
    }

    /**
     * Commit a transaction
     *
     * @return bool
     */
    public function commit(): bool
    {
        return $this->connection->commit();
    }

    /**
     * Rollback a transaction
     *
     * @return bool
     */
    public function rollback(): bool
    {
        return $this->connection->rollBack();
    }

    /**
     * Check if currently in a transaction
     *
     * @return bool
     */
    public function inTransaction(): bool
    {
        return $this->connection->inTransaction();
    }

    /**
     * Close the database connection
     *
     * @return void
     */
    public function closeConnection(): void
    {
        $this->connection = null;
    }

    /**
     * Prevent cloning
     *
     * @return void
     */
    private function __clone(): void
    {
    }

    /**
     * Prevent unserialization
     *
     * @return void
     */
    public function __wakeup(): void
    {
    }
}
