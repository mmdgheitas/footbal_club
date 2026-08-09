-- Migration: Update alerts table to support targeting by class, age range, or individual player

ALTER TABLE fc_alerts 
ADD COLUMN target_type ENUM('all', 'class', 'age_range', 'player', 'position') NULL AFTER target_audience,
ADD COLUMN target_id INT NULL AFTER target_type,
ADD COLUMN target_age_min INT NULL AFTER target_id,
ADD COLUMN target_age_max INT NULL AFTER target_age_min,
ADD COLUMN expires_at TIMESTAMP NULL AFTER updated_at,
ADD COLUMN priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' AFTER target_age_max,
ADD INDEX idx_target_type (target_type),
ADD INDEX idx_target_id (target_id),
ADD INDEX idx_expires_at (expires_at),
ADD INDEX idx_priority (priority);

-- Update existing alerts to have target_type
UPDATE fc_alerts SET target_type = 'all' WHERE target_type IS NULL;
