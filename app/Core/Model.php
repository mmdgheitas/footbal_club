<?php

declare(strict_types=1);

namespace App\Core;

/**
 * BaseModel - Parent class for all models
 * PSR-12 compliant - Handles common model logic and database operations
 */
abstract class Model
{
    protected Database $db;
    protected string $table = '';
    protected string $primaryKey = 'id';
    protected array $fillable = [];
    protected array $hidden = [];
    protected array $casts = [];

    /**
     * Constructor - Initialize model with database connection
     */
    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Get the table name
     *
     * @return string
     */
    public function getTable(): string
    {
        return $this->table;
    }

    /**
     * Get primary key name
     *
     * @return string
     */
    public function getPrimaryKey(): string
    {
        return $this->primaryKey;
    }

    /**
     * Find a record by primary key
     *
     * @param int $id ID value
     * @return array|null
     */
    public function find(int $id): ?array
    {
        $query = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?";
        return $this->db->findOne($query, [$id]);
    }

    /**
     * Find a record by a specific column
     *
     * @param string $column Column name
     * @param string $value Column value
     * @return array|null
     */
    public function findBy(string $column, string $value): ?array
    {
        $query = "SELECT * FROM {$this->table} WHERE {$column} = ?";
        return $this->db->findOne($query, [$value]);
    }

    /**
     * Find multiple records by a specific column
     *
     * @param string $column Column name
     * @param string $value Column value
     * @return array
     */
    public function findAllBy(string $column, string $value): array
    {
        $query = "SELECT * FROM {$this->table} WHERE {$column} = ?";
        return $this->db->findAll($query, [$value]);
    }

    /**
     * Get all records
     *
     * @param int $limit Limit results
     * @param int $offset Offset results
     * @return array
     */
    public function all(int $limit = 0, int $offset = 0): array
    {
        $query = "SELECT * FROM {$this->table}";

        if ($limit > 0) {
            $query .= " LIMIT {$limit}";
            if ($offset > 0) {
                $query .= " OFFSET {$offset}";
            }
        }

        return $this->db->findAll($query);
    }

    /**
     * Count total records
     *
     * @param string $where Optional WHERE clause
     * @return int
     */
    public function count(string $where = ''): int
    {
        $query = "SELECT COUNT(*) as count FROM {$this->table}";
        if (!empty($where)) {
            $query .= " WHERE {$where}";
        }
        $result = $this->db->findOne($query);
        return (int)($result['count'] ?? 0);
    }

    /**
     * Insert a new record
     *
     * @param array $data Data to insert
     * @return int|false Last insert ID or false on failure
     */
    public function insert(array $data): int|false
    {
        // Filter data to only include fillable fields
        $data = $this->filterFillable($data);

        if (empty($data)) {
            return false;
        }

        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $query = "INSERT INTO {$this->table} ({$columns}) VALUES ({$placeholders})";

        try {
            $result = $this->db->execute($query, array_values($data));
            return $result > 0 ? (int)$this->db->lastInsertId() : false;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Update a record
     *
     * @param int $id Record ID
     * @param array $data Data to update
     * @return bool
     */
    public function update(int $id, array $data): bool
    {
        // Filter data to only include fillable fields
        $data = $this->filterFillable($data);

        if (empty($data)) {
            return false;
        }

        $setClause = implode(', ', array_map(fn ($key) => "{$key} = ?", array_keys($data)));
        $query = "UPDATE {$this->table} SET {$setClause} WHERE {$this->primaryKey} = ?";

        try {
            $values = array_values($data);
            $values[] = $id;
            return $this->db->execute($query, $values) > 0;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Delete a record
     *
     * @param int $id Record ID
     * @return bool
     */
    public function delete(int $id): bool
    {
        $query = "DELETE FROM {$this->table} WHERE {$this->primaryKey} = ?";
        try {
            return $this->db->execute($query, [$id]) > 0;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Filter data to only include fillable fields
     *
     * @param array $data Data to filter
     * @return array
     */
    protected function filterFillable(array $data): array
    {
        if (empty($this->fillable)) {
            return $data;
        }

        $filtered = [];
        foreach ($data as $key => $value) {
            if (in_array($key, $this->fillable, true)) {
                $filtered[$key] = $value;
            }
        }

        return $filtered;
    }

    /**
     * Execute raw SQL query
     *
     * @param string $query SQL query
     * @param array $params Parameters
     * @return array
     */
    protected function query(string $query, array $params = []): array
    {
        return $this->db->findAll($query, $params);
    }

    /**
     * Execute raw SQL query and get one result
     *
     * @param string $query SQL query
     * @param array $params Parameters
     * @return array|null
     */
    protected function queryOne(string $query, array $params = []): ?array
    {
        return $this->db->findOne($query, $params);
    }

    /**
     * Paginate results
     *
     * @param int $page Current page
     * @param int $perPage Items per page
     * @return array
     */
    public function paginate(int $page = 1, int $perPage = ITEMS_PER_PAGE): array
    {
        $page = max(1, $page);
        $offset = ($page - 1) * $perPage;

        $total = $this->count();
        $data = $this->all($perPage, $offset);

        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / $perPage),
            'has_more' => $offset + count($data) < $total,
        ];
    }

    /**
     * Start a database transaction
     *
     * @return bool
     */
    protected function beginTransaction(): bool
    {
        return $this->db->beginTransaction();
    }

    /**
     * Commit a transaction
     *
     * @return bool
     */
    protected function commit(): bool
    {
        return $this->db->commit();
    }

    /**
     * Rollback a transaction
     *
     * @return bool
     */
    protected function rollback(): bool
    {
        return $this->db->rollback();
    }
}
