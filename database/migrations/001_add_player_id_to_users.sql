-- Migration: Add player_id to users table for user-player relationship
-- This allows linking a user account to a player profile

ALTER TABLE fc_users 
ADD COLUMN player_id INT NULL AFTER role,
ADD INDEX idx_player_id (player_id),
ADD FOREIGN KEY (player_id) REFERENCES fc_players(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add document_status to track approval workflow
ALTER TABLE fc_users 
ADD COLUMN document_status ENUM('pending', 'approved', 'rejected') NULL AFTER status,
ADD COLUMN rejection_reason TEXT NULL AFTER document_status,
ADD COLUMN approved_by INT NULL AFTER rejection_reason,
ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by,
ADD FOREIGN KEY (approved_by) REFERENCES fc_users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add player role to enum
ALTER TABLE fc_users 
MODIFY COLUMN role ENUM('super_admin', 'coach', 'accountant', 'secretary', 'player') NOT NULL DEFAULT 'coach';
