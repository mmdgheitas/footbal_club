-- =============================================================================
-- Migration 006 — Feature expansion (MySQL 8 / InnoDB / utf8mb4)
--
-- Adds every table and column required by the full feature set:
--   * ولی به‌عنوان یک نقش مستقل با حساب کاربری خودش
--   * کارت عضویت دیجیتال
--   * امتیاز، نشان و عملکرد بازیکن
--   * هزینه‌های دستی باشگاه
--   * اعلان‌های درون‌پنلی
--   * ورود با کد یک‌بارمصرف (OTP)
--   * جلسات تمرین
--
-- Safe to run on an existing database: every ALTER only adds nullable or
-- defaulted columns, and every CREATE uses IF NOT EXISTS.
--
-- Run with:  mysql -u USER -p football_club < database/migrations/006_feature_expansion.sql
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1. fc_players — پرونده فنی، وضعیت ثبت‌نام و امتیاز
-- -----------------------------------------------------------------------------
ALTER TABLE fc_players
    ADD COLUMN father_name         VARCHAR(255) NULL AFTER name,
    ADD COLUMN height_cm           INT NULL AFTER position,
    ADD COLUMN weight_kg           INT NULL AFTER height_cm,
    ADD COLUMN preferred_foot      ENUM('left','right','both') NULL AFTER weight_kg,
    ADD COLUMN photo_path          VARCHAR(500) NULL AFTER preferred_foot,
    ADD COLUMN membership_date     DATE NULL AFTER photo_path,
    ADD COLUMN registration_status ENUM('pending','approved','incomplete')
        NOT NULL DEFAULT 'pending' AFTER status,
    ADD COLUMN total_score         INT NOT NULL DEFAULT 0 AFTER registration_status,
    ADD INDEX idx_registration_status (registration_status);

-- Existing, already-active players keep working: treat them as approved.
UPDATE fc_players SET registration_status = 'approved'
    WHERE status = 1 AND registration_status = 'pending';
UPDATE fc_players SET membership_date = DATE(created_at)
    WHERE membership_date IS NULL;

-- -----------------------------------------------------------------------------
-- 2. fc_users — شماره موبایل به‌عنوان اصلی‌ترین فیلد ورود
--
-- NOTE: the UNIQUE index fails if duplicate phone numbers already exist. Run
--   SELECT phone, COUNT(*) c FROM fc_users WHERE phone IS NOT NULL
--   GROUP BY phone HAVING c > 1;
-- and clean those rows first. NULL phones are allowed and stay allowed.
-- -----------------------------------------------------------------------------
ALTER TABLE fc_users
    ADD COLUMN guardian_id INT NULL AFTER player_id,
    ADD UNIQUE INDEX idx_phone_unique (phone);

-- -----------------------------------------------------------------------------
-- 3. fc_guardians_users — حساب کاربری ولی
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_guardians_users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    uuid          CHAR(36) NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    phone         VARCHAR(15) NOT NULL,
    national_id   VARCHAR(50) NULL,
    password_hash VARCHAR(255) NULL,
    status        TINYINT(1) NOT NULL DEFAULT 1,
    last_login    TIMESTAMP NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP NULL,
    UNIQUE KEY idx_phone (phone),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE fc_users
    ADD CONSTRAINT fk_users_guardian FOREIGN KEY (guardian_id)
        REFERENCES fc_guardians_users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 4. fc_player_guardians — یک ولی → چند بازیکن، هر بازیکن فقط یک ولی
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_player_guardians (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    guardian_id  INT NOT NULL,
    player_id    INT NOT NULL,
    relationship VARCHAR(50) NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_player_unique (player_id),
    KEY idx_guardian_id (guardian_id),
    CONSTRAINT fk_pg_guardian FOREIGN KEY (guardian_id)
        REFERENCES fc_guardians_users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pg_player FOREIGN KEY (player_id)
        REFERENCES fc_players(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. fc_membership_cards — کارت عضویت دیجیتال ۸×۱۱
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_membership_cards (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    player_id   INT NOT NULL,
    card_number VARCHAR(50) NOT NULL,
    issued_at   DATETIME NOT NULL,
    pdf_path    VARCHAR(500) NULL,
    status      ENUM('active','revoked','expired') NOT NULL DEFAULT 'active',
    issued_by   INT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_card_number (card_number),
    KEY idx_player_id (player_id),
    KEY idx_status (status),
    CONSTRAINT fk_card_player FOREIGN KEY (player_id)
        REFERENCES fc_players(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. fc_player_scores — امتیاز (جمع ساده)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_player_scores (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    player_id    INT NOT NULL,
    scored_by    INT NULL,
    points       INT NOT NULL DEFAULT 0,
    reason       VARCHAR(255) NULL,
    session_date DATE NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_player_id (player_id),
    KEY idx_scored_by (scored_by),
    KEY idx_session_date (session_date),
    CONSTRAINT fk_score_player FOREIGN KEY (player_id)
        REFERENCES fc_players(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_score_user FOREIGN KEY (scored_by)
        REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. fc_player_badges — نشان‌ها (فقط مدیر ارشد)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_player_badges (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    player_id   INT NOT NULL,
    badge_key   VARCHAR(60) NOT NULL,
    badge_title VARCHAR(120) NOT NULL,
    assigned_by INT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note        VARCHAR(255) NULL,
    KEY idx_player_id (player_id),
    KEY idx_badge_key (badge_key),
    CONSTRAINT fk_badge_player FOREIGN KEY (player_id)
        REFERENCES fc_players(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_badge_user FOREIGN KEY (assigned_by)
        REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. fc_player_performances — گل، پاس گل، دریبل، مسابقه و ...
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_player_performances (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    player_id    INT NOT NULL,
    recorded_by  INT NULL,
    type         VARCHAR(50) NOT NULL,
    value        INT NOT NULL DEFAULT 1,
    description  TEXT NULL,
    match_type   ENUM('training','friendly','official') NOT NULL DEFAULT 'training',
    session_date DATE NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_player_id (player_id),
    KEY idx_recorded_by (recorded_by),
    KEY idx_type (type),
    KEY idx_session_date (session_date),
    CONSTRAINT fk_perf_player FOREIGN KEY (player_id)
        REFERENCES fc_players(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_perf_user FOREIGN KEY (recorded_by)
        REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. fc_expenses — هزینه‌های دستی باشگاه
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_expenses (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    amount       DECIMAL(15,2) NOT NULL,
    category     ENUM('hall','grass','office_rent','salary','equipment','transport','other')
                 NOT NULL DEFAULT 'other',
    expense_date DATE NOT NULL,
    recorded_by  INT NULL,
    note         TEXT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP NULL,
    KEY idx_category (category),
    KEY idx_expense_date (expense_date),
    CONSTRAINT fk_expense_user FOREIGN KEY (recorded_by)
        REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. fc_notifications — اعلان درون‌پنلی (بدون پوش نوتیفیکیشن)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_type  ENUM('player','guardian','coach','admin') NOT NULL,
    user_id    INT NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    type       ENUM('debt','performance','score','badge','registration','card','attendance','training','system')
               NOT NULL DEFAULT 'system',
    link       VARCHAR(255) NULL,
    is_read    TINYINT(1) NOT NULL DEFAULT 0,
    dedupe_key VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user_type (user_type),
    KEY idx_user_id (user_id),
    KEY idx_type (type),
    KEY idx_is_read (is_read),
    KEY idx_dedupe_key (dedupe_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. fc_otp_codes — کدهای یک‌بارمصرف
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_otp_codes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    phone      VARCHAR(15) NOT NULL,
    code       VARCHAR(128) NOT NULL,
    expires_at DATETIME NOT NULL,
    used       TINYINT(1) NOT NULL DEFAULT 0,
    attempts   INT NOT NULL DEFAULT 0,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_phone (phone),
    KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. fc_training_sessions — جلسات تمرین
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fc_training_sessions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id INT NULL,
    title        VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    start_time   VARCHAR(10) NULL,
    location     VARCHAR(255) NULL,
    notes        TEXT NULL,
    created_by   INT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP NULL,
    KEY idx_classroom_id (classroom_id),
    KEY idx_session_date (session_date),
    CONSTRAINT fk_training_classroom FOREIGN KEY (classroom_id)
        REFERENCES fc_classrooms(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_training_user FOREIGN KEY (created_by)
        REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. Backfill — ولی‌ها از روی fc_guardians موجود
--     (هر بازیکن اولین ولی ثبت‌شده‌اش را می‌گیرد)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO fc_guardians_users (uuid, name, phone, status, created_at, updated_at)
SELECT UUID(), g.name, g.phone, 1, NOW(), NOW()
FROM fc_guardians g
WHERE g.deleted_at IS NULL AND g.phone IS NOT NULL AND g.phone <> ''
GROUP BY g.phone, g.name;

INSERT IGNORE INTO fc_player_guardians (guardian_id, player_id, relationship, created_at)
SELECT gu.id, g.player_id, g.relationship, NOW()
FROM fc_guardians g
JOIN fc_guardians_users gu ON gu.phone = g.phone
WHERE g.deleted_at IS NULL
GROUP BY g.player_id;
