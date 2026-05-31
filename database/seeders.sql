-- Football Club Management System - Seed Data
-- Sample data for development and testing

-- Super Admin User
INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status)
VALUES (UUID(), 'System Admin', 'admin@footballclub.local', '+1234567890', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'super_admin', 1);

-- Coach User
INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status)
VALUES (UUID(), 'John Coach', 'coach@footballclub.local', '+1234567891', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'coach', 1);

-- Accountant User
INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status)
VALUES (UUID(), 'Jane Accountant', 'accountant@footballclub.local', '+1234567892', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'accountant', 1);

-- Secretary User
INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status)
VALUES (UUID(), 'Maria Secretary', 'secretary@footballclub.local', '+1234567893', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'secretary', 1);

-- Sample Players (U10 Category)
INSERT INTO fc_players (uuid, name, date_of_birth, national_id, position, phone, email, medical_clearance, status)
VALUES 
(UUID(), 'Alex Johnson', '2016-03-15', 'NAT-001', 'forward', '+1111111111', 'alex@example.com', 1, 1),
(UUID(), 'Bobby Smith', '2015-07-22', 'NAT-002', 'midfielder', '+1111111112', 'bobby@example.com', 1, 1),
(UUID(), 'Charlie Davis', '2016-01-10', 'NAT-003', 'defender', '+1111111113', 'charlie@example.com', 1, 1),
(UUID(), 'Diana Wilson', '2015-11-05', 'NAT-004', 'goalkeeper', '+1111111114', 'diana@example.com', 1, 1),
(UUID(), 'Edward Brown', '2016-05-30', 'NAT-005', 'striker', '+1111111115', 'edward@example.com', 1, 1);

-- Sample Guardians
INSERT INTO fc_guardians (uuid, player_id, name, relationship, phone, email, address)
SELECT UUID(), id, 'Parent ' || name, 'Parent', '+1111111111', CONCAT('parent-', id, '@example.com'), '123 Main Street'
FROM fc_players WHERE status = 1 LIMIT 5;

-- Sample Medical Records
INSERT INTO fc_medical_records (uuid, player_id, blood_type, allergies, vaccination_status, last_exam_date)
SELECT UUID(), id, 'O+', 'None', 'Current', DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
FROM fc_players WHERE status = 1 LIMIT 5;

-- Sample Payments
INSERT INTO fc_payments (uuid, player_id, amount, description, payment_method, status)
SELECT UUID(), id, 500.00, 'Monthly tuition', 'bank_transfer', 'completed'
FROM fc_players WHERE status = 1 LIMIT 3;

-- Sample Attendance
INSERT INTO fc_attendance (uuid, player_id, session_date, status, recorded_by)
SELECT UUID(), id, DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY), FLOOR(1 + RAND() * 4), 2
FROM fc_players WHERE status = 1;

-- Default Settings
INSERT INTO fc_settings (setting_key, setting_value)
VALUES 
('app_name', 'Football Club Manager'),
('attendance_warning_threshold', '75'),
('max_upload_size', '10485760'),
('sms_provider', 'twilio');
