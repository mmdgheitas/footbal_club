<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Player Model
 * PSR-12 compliant - Handles player-related database operations
 */
class Player extends Model
{
    protected string $table = 'fc_players';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'uuid',
        'name',
        'date_of_birth',
        'national_id',
        'position',
        'phone',
        'email',
        'medical_clearance',
        'status',
        'notes',
        'age_category',
    ];

    /**
     * Get player with all related data
     *
     * @param int $id Player ID
     * @return array|null
     */
    public function getWithDetails(int $id): ?array
    {
        $player = $this->find($id);

        if ($player === null) {
            return null;
        }

        // Get guardian information
        $guardianModel = new Guardian();
        $player['guardians'] = $guardianModel->getByPlayerId($id);

        // Get medical records
        $medicalModel = new Medical();
        $player['medical'] = $medicalModel->getByPlayerId($id);

        // Get injury history
        $injuryModel = new Injury();
        $player['injuries'] = $injuryModel->findAllBy('player_id', (string)$id);

        // Get file uploads
        $fileModel = new FileUpload();
        $player['files'] = $fileModel->getByPlayerId($id);

        return $player;
    }

    /**
     * Get all active players
     *
     * @return array
     */
    public function getActive(): array
    {
        $query = "SELECT * FROM {$this->table} WHERE status = 1 AND deleted_at IS NULL ORDER BY name ASC";
        return $this->db->findAll($query);
    }

    /**
     * Get players by position
     *
     * @param string $position Player position
     * @return array
     */
    public function getByPosition(string $position): array
    {
        $query = "SELECT * FROM {$this->table} WHERE position = ? AND status = 1";
        return $this->db->findAll($query, [$position]);
    }

    /**
     * Get players by age category
     *
     * @param string $ageCategory Age category
     * @return array
     */
    public function getByAgeCategory(string $ageCategory): array
    {
        $query = "SELECT * FROM {$this->table} WHERE age_category = ? AND status = 1";
        return $this->db->findAll($query, [$ageCategory]);
    }

    /**
     * Find player by national ID
     *
     * @param string $nationalId National ID
     * @return array|null
     */
    public function findByNationalId(string $nationalId): ?array
    {
        return $this->findBy('national_id', $nationalId);
    }

    /**
     * Calculate age from date of birth
     *
     * @param string $dateOfBirth Date of birth (Y-m-d format)
     * @return int
     */
    public function calculateAge(string $dateOfBirth): int
    {
        $birthDate = new \DateTime($dateOfBirth);
        $today = new \DateTime();
        $age = $today->diff($birthDate);

        return $age->y;
    }

    /**
     * Get age category
     *
     * @param string $dateOfBirth Date of birth
     * @return string
     */
    public function getAgeCategory(string $dateOfBirth): string
    {
        $age = $this->calculateAge($dateOfBirth);

        foreach (AGE_CATEGORIES as $category => $range) {
            if ($age >= $range['min'] && $age <= $range['max']) {
                return $category;
            }
        }

        return 'senior';
    }

    /**
     * Get player statistics
     *
     * @return array
     */
    public function getStatistics(): array
    {
        $totalPlayers = $this->count("status = 1 AND deleted_at IS NULL");

        $query = "SELECT age_category, COUNT(*) as count FROM {$this->table} WHERE status = 1 GROUP BY age_category";
        $byCategory = $this->db->findAll($query);

        $query = "SELECT position, COUNT(*) as count FROM {$this->table} WHERE status = 1 GROUP BY position";
        $byPosition = $this->db->findAll($query);

        return [
            'total' => $totalPlayers,
            'by_category' => $byCategory,
            'by_position' => $byPosition,
        ];
    }

    /**
     * Search players
     *
     * @param string $searchTerm Search term
     * @return array
     */
    public function search(string $searchTerm): array
    {
        $query = "SELECT * FROM {$this->table} WHERE (name LIKE ? OR national_id LIKE ? OR email LIKE ?) AND status = 1";
        $pattern = '%' . $searchTerm . '%';
        return $this->db->findAll($query, [$pattern, $pattern, $pattern]);
    }

    /**
     * Create player with UUID
     *
     * @param array $data Player data
     * @return int|false
     */
    public function createPlayer(array $data): int|false
    {
        $data['uuid'] = $data['uuid'] ?? $this->generateUuid();
        if (isset($data['date_of_birth'])) {
            $data['age_category'] = $this->getAgeCategory($data['date_of_birth']);
        }
        return $this->insert($data);
    }

    /**
     * Update a player record
     *
     * @param int $id Player ID
     * @param array $data Data to update
     * @return bool
     */
    public function update(int $id, array $data): bool
    {
        if (isset($data['date_of_birth'])) {
            $data['age_category'] = $this->getAgeCategory($data['date_of_birth']);
        }
        return parent::update($id, $data);
    }

    /**
     * Generate UUID
     *
     * @return string
     */
    private function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Soft delete player
     *
     * @param int $id Player ID
     * @return bool
     */
    public function softDelete(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = ? WHERE id = ?";
        return $this->db->execute($query, [date(DATETIME_FORMAT), $id]) > 0;
    }

    /**
     * Restore soft-deleted player
     *
     * @param int $id Player ID
     * @return bool
     */
    public function restore(int $id): bool
    {
        $query = "UPDATE {$this->table} SET deleted_at = NULL WHERE id = ?";
        return $this->db->execute($query, [$id]) > 0;
    }
}
