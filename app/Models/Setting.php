<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Application settings (key/value store)
 */
class Setting extends Model
{
    protected string $table = 'fc_settings';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'setting_key',
        'setting_value',
    ];

    /**
     * @return array<string, string>
     */
    public function getAllKeyed(): array
    {
        $rows = $this->db->findAll("SELECT setting_key, setting_value FROM {$this->table}");
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = (string)($row['setting_value'] ?? '');
        }

        return $settings;
    }

    public function get(string $key, ?string $default = null): ?string
    {
        $row = $this->db->findOne(
            "SELECT setting_value FROM {$this->table} WHERE setting_key = ?",
            [$key]
        );

        if ($row === null) {
            return $default;
        }

        return (string)$row['setting_value'];
    }

    /**
     * @param array<string, string|int|float> $settings
     */
    public function setMany(array $settings): bool
    {
        $query = "INSERT INTO {$this->table} (setting_key, setting_value)
                  VALUES (?, ?)
                  ON DUPLICATE KEY UPDATE setting_value = ?";

        foreach ($settings as $key => $value) {
            $this->db->execute($query, [$key, (string)$value, (string)$value]);
        }

        return true;
    }
}
