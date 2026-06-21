-- Update database schema for Classrooms management

CREATE TABLE IF NOT EXISTS fc_classrooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL UNIQUE,
    description LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add classroom_id to fc_players
ALTER TABLE fc_players 
ADD COLUMN classroom_id INT NULL DEFAULT NULL AFTER uuid;

-- Add index and foreign key
ALTER TABLE fc_players
ADD INDEX idx_classroom_id (classroom_id);

ALTER TABLE fc_players
ADD CONSTRAINT fk_player_classroom
FOREIGN KEY (classroom_id) REFERENCES fc_classrooms(id)
ON DELETE SET NULL
ON UPDATE CASCADE;
