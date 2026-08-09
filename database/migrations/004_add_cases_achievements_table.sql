-- Migration: Create cases/achievements table for admin to send achievements to students

CREATE TABLE IF NOT EXISTS fc_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    user_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    achievement_type ENUM('skill', 'attendance', 'sportsmanship', 'improvement', 'teamwork', 'leadership', 'other') NOT NULL DEFAULT 'skill',
    points INT NULL DEFAULT 0,
    date_achieved DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by INT NOT NULL,
    is_published TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_by (created_by),
    INDEX idx_achievement_type (achievement_type),
    INDEX idx_date_achieved (date_achieved),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create case notes table for additional context
CREATE TABLE IF NOT EXISTS fc_case_notes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    user_id INT NULL,
    note_type ENUM('general', 'medical', 'disciplinary', 'achievement', 'concern') NOT NULL DEFAULT 'general',
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    severity ENUM('low', 'medium', 'high') DEFAULT 'low',
    created_by INT NOT NULL,
    is_visible_to_player TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_by (created_by),
    INDEX idx_note_type (note_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
