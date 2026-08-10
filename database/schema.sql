-- Football Club Management System - Database Schema
-- MySQL/MariaDB schema with proper constraints, indexes, and circular reference handling
-- Tables are created in dependency order to avoid foreign key issues

-- 1️⃣ Create fc_classrooms first (without coach_id FK - added later to break circular ref)
CREATE TABLE IF NOT EXISTS fc_classrooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description LONGTEXT,
    coach_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_name (name),
    INDEX idx_coach_id (coach_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2️⃣ Create fc_players (references fc_classrooms)
CREATE TABLE IF NOT EXISTS fc_players (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    classroom_id INT NULL,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    national_id VARCHAR(50) UNIQUE NOT NULL,
    position ENUM('goalkeeper', 'defender', 'midfielder', 'forward', 'striker') NOT NULL,
    age_category ENUM('u8', 'u10', 'u12', 'u14', 'u16', 'u18', 'senior') NOT NULL DEFAULT 'senior',
    phone VARCHAR(15),
    email VARCHAR(255),
    medical_clearance TINYINT(1) DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    notes LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_classroom_id (classroom_id),
    INDEX idx_national_id (national_id),
    INDEX idx_position (position),
    INDEX idx_age_category (age_category),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (classroom_id) REFERENCES fc_classrooms(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3️⃣ Create fc_users (references fc_players and self)
CREATE TABLE IF NOT EXISTS fc_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'coach', 'accountant', 'secretary', 'player') NOT NULL DEFAULT 'coach',
    player_id INT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    document_status ENUM('pending', 'approved', 'rejected') NULL DEFAULT NULL,
    rejection_reason TEXT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_player_id (player_id),
    INDEX idx_status (status),
    INDEX idx_document_status (document_status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4️⃣ Now add the deferred FK from fc_classrooms.coach_id -> fc_users.id
ALTER TABLE fc_classrooms
    ADD CONSTRAINT fk_classrooms_coach
    FOREIGN KEY (coach_id) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- 5️⃣ Remaining tables in dependency order

CREATE TABLE IF NOT EXISTS fc_guardians (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100),
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    address LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_medical_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    blood_type VARCHAR(10),
    allergies LONGTEXT,
    medical_conditions LONGTEXT,
    vaccination_status VARCHAR(100),
    last_exam_date DATE,
    exam_notes LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_injuries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    injury_type VARCHAR(100) NOT NULL,
    severity ENUM('minor', 'moderate', 'severe') NOT NULL,
    date_of_injury DATE NOT NULL,
    recovery_date DATE,
    notes LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_date_of_injury (date_of_injury)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    session_date DATE NOT NULL,
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1=Present, 2=Absent, 3=Excused, 4=Late',
    recorded_by INT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE INDEX idx_player_session (player_id, session_date),
    INDEX idx_session_date (session_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description VARCHAR(255),
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    receipt_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_reference_number (reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_transaction_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    payment_id INT NULL,
    entry_type ENUM('debit', 'credit') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    account_code VARCHAR(50),
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES fc_payments(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_payment_id (payment_id),
    INDEX idx_entry_type (entry_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_discounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NULL,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2),
    percentage DECIMAL(5, 2),
    reason VARCHAR(255),
    valid_from DATE,
    valid_to DATE,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_file_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    file_type ENUM('national_id', 'medical_clearance', 'insurance', 'other') NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size INT,
    uploaded_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_file_type (file_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_sms_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NULL,
    recipient_phone VARCHAR(15) NOT NULL,
    message TEXT NOT NULL,
    sms_type VARCHAR(50) COMMENT 'tuition_reminder, absence_alert, etc',
    provider VARCHAR(100),
    provider_message_id VARCHAR(100),
    status ENUM('pending', 'sent', 'failed', 'delivered') DEFAULT 'pending',
    error_message VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_recipient_phone (recipient_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_audience VARCHAR(100),
    target_type ENUM('all', 'class', 'age_range', 'player', 'position') NULL DEFAULT 'all',
    target_id INT NULL,
    target_age_min INT NULL,
    target_age_max INT NULL,
    created_by INT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    expires_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (target_id) REFERENCES fc_classrooms(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_target_audience (target_audience),
    INDEX idx_target_type (target_type),
    INDEX idx_target_id (target_id),
    INDEX idx_target_age_min (target_age_min),
    INDEX idx_target_age_max (target_age_max),
    INDEX idx_priority (priority),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_entity_type (entity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_sessions (
    id VARCHAR(40) PRIMARY KEY,
    user_id INT NULL,
    data LONGTEXT,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES fc_users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_document_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    player_id INT NULL,
    document_type ENUM('national_id', 'medical_clearance', 'insurance', 'birth_certificate', 'other') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT NULL,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES fc_users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_player_id (player_id),
    INDEX idx_status (status),
    INDEX idx_document_type (document_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_homework_videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    user_id INT NOT NULL,
    classroom_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    video_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size INT,
    duration_seconds INT NULL COMMENT 'Video duration in seconds',
    status ENUM('submitted', 'reviewed', 'approved') DEFAULT 'submitted',
    coach_feedback TEXT NULL,
    coach_rating TINYINT NULL COMMENT 'Rating 1-5',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES fc_users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (classroom_id) REFERENCES fc_classrooms(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_user_id (user_id),
    INDEX idx_classroom_id (classroom_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    user_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    achievement_type ENUM('skill', 'attendance', 'sportsmanship', 'improvement', 'teamwork', 'leadership', 'other') NOT NULL DEFAULT 'skill',
    points INT NULL DEFAULT 0,
    date_achieved DATE NOT NULL DEFAULT (CURRENT_DATE),
    created_by INT NULL,
    is_published TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_by (created_by),
    INDEX idx_achievement_type (achievement_type),
    INDEX idx_date_achieved (date_achieved),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_case_notes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL UNIQUE,
    player_id INT NOT NULL,
    user_id INT NULL,
    note_type ENUM('general', 'medical', 'disciplinary', 'achievement', 'concern') NOT NULL DEFAULT 'general',
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    severity ENUM('low', 'medium', 'high') DEFAULT 'low',
    created_by INT NULL,
    is_visible_to_player TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES fc_players(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES fc_users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_by (created_by),
    INDEX idx_note_type (note_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
