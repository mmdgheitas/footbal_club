-- Football Club Management System - Seed Data
-- Sample data for development and testing

-- Super Admin User
INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status, document_status)
VALUES (UUID(), 'System Admin', 'admin@footballclub.local', '+1234567890', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'super_admin', 1, 'approved');

-- Coach User
INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status, document_status)
VALUES (UUID(), 'John Coach', 'coach@footballclub.local', '+1234567891', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'coach', 1, 'approved');

-- Accountant User
INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status, document_status)
VALUES (UUID(), 'Jane Accountant', 'accountant@footballclub.local', '+1234567892', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'accountant', 1, 'approved');

-- Secretary User
INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status, document_status)
VALUES (UUID(), 'Maria Secretary', 'secretary@footballclub.local', '+1234567893', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'secretary', 1, 'approved');

-- Classrooms
INSERT INTO fc_classrooms (uuid, name, description, coach_id)
VALUES 
(UUID(), 'تیم A زیر 10 سال', 'تیم اصلی زیر 10 سال', 2),
(UUID(), 'تیم B زیر 10 سال', 'تیم دوم زیر 10 سال', 2),
(UUID(), 'تیم زیر 12 سال', 'تیم زیر 12 سال', 2);

-- Sample Players (U10 Category)
INSERT INTO fc_players (uuid, name, date_of_birth, national_id, position, phone, email, medical_clearance, status, classroom_id)
VALUES 
(UUID(), 'Alex Johnson', '2016-03-15', 'NAT-001', 'forward', '+1111111111', 'alex.player@example.com', 1, 1, 1),
(UUID(), 'Bobby Smith', '2015-07-22', 'NAT-002', 'midfielder', '+1111111112', 'bobby.player@example.com', 1, 1, 1),
(UUID(), 'Charlie Davis', '2016-01-10', 'NAT-003', 'defender', '+1111111113', 'charlie.player@example.com', 1, 1, 1),
(UUID(), 'Diana Wilson', '2015-11-05', 'NAT-004', 'goalkeeper', '+1111111114', 'diana.player@example.com', 1, 1, 2),
(UUID(), 'Edward Brown', '2016-05-30', 'NAT-005', 'striker', '+1111111115', 'edward.player@example.com', 1, 1, 2);

-- Player Users (linked to players)
INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status, document_status, player_id)
VALUES 
(UUID(), 'Alex Johnson', 'alex.player@example.com', '+1111111111', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'player', 1, 'approved', 1),
(UUID(), 'Bobby Smith', 'bobby.player@example.com', '+1111111112', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'player', 1, 'approved', 2),
(UUID(), 'Charlie Davis', 'charlie.player@example.com', '+1111111113', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'player', 1, 'approved', 3),
(UUID(), 'Diana Wilson', 'diana.player@example.com', '+1111111114', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'player', 1, 'approved', 4),
(UUID(), 'Edward Brown', 'edward.player@example.com', '+1111111115', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'player', 1, 'approved', 5);

-- Player with pending documents (for testing)
INSERT INTO fc_players (uuid, name, date_of_birth, national_id, position, phone, email, medical_clearance, status, classroom_id)
VALUES 
(UUID(), 'Frank Miller', '2016-08-20', 'NAT-006', 'midfielder', '+1111111116', 'frank.player@example.com', 0, 1, 1);

INSERT INTO fc_users (uuid, name, email, phone, password_hash, role, status, document_status, player_id)
VALUES 
(UUID(), 'Frank Miller', 'frank.player@example.com', '+1111111116', '$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.', 'player', 0, 'pending', 6);

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
('sms_provider', 'mock');

-- Sample Alerts with targeting
INSERT INTO fc_alerts (uuid, title, message, target_audience, target_type, target_id, created_by, priority)
VALUES 
(UUID(), 'جلسه تمرینی فردا', 'جلسه تمرینی فردا ساعت 16 برگزار می‌شود. حضور همه بازیکنان الزامی است.', 'all', 'all', NULL, 1, 'high'),
(UUID(), 'تغییر زمان تمرین', 'توجه: زمان تمرین تیم A به ساعت 17 تغییر یافته است.', 'all', 'class', 1, 1, 'medium');

INSERT INTO fc_alerts (uuid, title, message, target_audience, target_type, target_id, target_age_min, target_age_max, created_by, priority)
VALUES 
(UUID(), 'تست پزشکی', 'بازیکنان زیر 10 سال باید برای تست پزشکی فردا حاضر شوند.', 'all', 'age_range', NULL, 5, 10, 1, 'high');

-- Sample Achievements
INSERT INTO fc_achievements (uuid, player_id, user_id, title, description, achievement_type, points, date_achieved, created_by, is_published)
VALUES 
(UUID(), 1, 6, 'بهترین گلزن هفته', 'برنده جایزه بهترین گلزن هفته شد', 'skill', 10, '2024-01-15', 1, 1),
(UUID(), 2, 7, 'حضور کامل در ماه', 'در تمام جلسات ماه گذشته حضور داشته است', 'attendance', 5, '2024-01-20', 1, 1),
(UUID(), 1, 6, 'روحیه تیمی عالی', 'به خاطر روحیه تیمی و همکاری با سایر بازیکنان', 'sportsmanship', 8, '2024-01-25', 2, 1);

-- Sample Case Notes
INSERT INTO fc_case_notes (uuid, player_id, user_id, note_type, title, content, severity, created_by, is_visible_to_player)
VALUES 
(UUID(), 1, 6, 'achievement', 'دستاورد جدید', 'بازیکن در مسابقات اخیر عملکرد خوبی داشته است.', 'low', 1, 1),
(UUID(), 2, 7, 'concern', 'نیاز به بهبود', 'بازیکن نیاز به بهبود در پاس‌های دفاعی دارد.', 'medium', 1, 0),
(UUID(), 3, 8, 'medical', 'ویزیت پزشکی', 'بازیکن برای ویزیت پزشکی سالانه مراجعه کرده است.', 'low', 2, 0);

-- Sample Document Submissions (for Frank Miller - pending approval)
INSERT INTO fc_document_submissions (uuid, user_id, player_id, document_type, file_path, original_filename, stored_filename, mime_type, file_size, status)
VALUES 
(UUID(), 11, 6, 'national_id', '/var/www/football-club/public/uploads/documents/doc_11_abc123.pdf', 'national_id_frank.pdf', 'doc_11_abc123.pdf', 'application/pdf', 102400, 'pending'),
(UUID(), 11, 6, 'birth_certificate', '/var/www/football-club/public/uploads/documents/doc_11_def456.pdf', 'birth_cert_frank.pdf', 'doc_11_def456.pdf', 'application/pdf', 150000, 'pending');
