-- =============================================================================
-- Migration 007 — درگاه پرداخت آنلاین (MySQL 8 / InnoDB / utf8mb4)
--
-- One row per attempt at the gateway, linked to the fc_payments invoice it
-- settles. Keeping the attempts out of fc_payments means a failed or abandoned
-- attempt never touches the invoice, and a re-verify can never double-credit.
--
-- Safe to run on an existing database.
--
-- Run with:  mysql -u USER -p football_club < database/migrations/007_payment_gateway.sql
-- =============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS fc_payment_transactions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    uuid           CHAR(36) NOT NULL UNIQUE,
    payment_id     INT NOT NULL,
    gateway        VARCHAR(30) NOT NULL,
    mode           ENUM('mock','sandbox','production') NOT NULL DEFAULT 'mock',
    amount         DECIMAL(15,2) NOT NULL,
    -- What was actually sent to the gateway (usually ریال = amount × 10).
    gateway_amount BIGINT NOT NULL,
    authority      VARCHAR(255) NULL,
    ref_id         VARCHAR(100) NULL,
    card_pan       VARCHAR(30) NULL,
    status         ENUM('initiated','pending','paid','verified','failed','canceled')
                   NOT NULL DEFAULT 'initiated',
    payer_type     ENUM('guardian','player','admin','system') NOT NULL DEFAULT 'guardian',
    payer_id       INT NULL,
    description    VARCHAR(255) NULL,
    error_code     VARCHAR(50) NULL,
    error_message  VARCHAR(255) NULL,
    request_payload  TEXT NULL,
    response_payload TEXT NULL,
    callback_ip    VARCHAR(45) NULL,
    verified_at    DATETIME NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_gateway_authority (gateway, authority),
    KEY idx_payment_id (payment_id),
    KEY idx_status (status),
    KEY idx_payer (payer_type, payer_id),
    KEY idx_created_at (created_at),
    CONSTRAINT fk_paytx_payment FOREIGN KEY (payment_id)
        REFERENCES fc_payments(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices carry a due date and remember who issued them.
ALTER TABLE fc_payments
    ADD COLUMN due_date   DATE NULL AFTER description,
    ADD COLUMN created_by INT NULL AFTER receipt_path,
    ADD COLUMN paid_at    DATETIME NULL AFTER created_by,
    ADD INDEX idx_due_date (due_date);
