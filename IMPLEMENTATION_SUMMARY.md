# Implementation Summary - Football Club Management System Fixes

## Overview
This document summarizes the implementation of 7 key requirements for the Football Club Management System.

---

## 📋 Implemented Requirements

### 1. ✅ User-Player Relationship

**Problem**: When a student signs up, a row is created in `fc_users` but doesn't have a `player_id` value and there's no place to relate a player to a user.

**Solution**:
- Added `player_id` column to `fc_users` table (NULLABLE, FK to fc_players)
- Added `role='player'` to the roles enum
- Updated `User` model to handle player_id and document_status fields
- Modified `AuthController::store()` to:
  - Create a player profile first
  - Then create a user linked to that player
  - Set user role to 'player'
  - Set status to 0 (inactive) until documents are approved
  - Set document_status to 'pending'
- Added methods to User model:
  - `approveDocuments()` - Approve all documents for a user
  - `rejectDocuments()` - Reject documents with reason
  - `linkToPlayer()` - Link user to player
  - `getWithPlayer()` - Get user with player info

**Files Modified**:
- `database/schema.sql` - Added player_id, document_status, rejection_reason, approved_by, approved_at to fc_users
- `app/Models/User.php` - Updated fillable, added document management methods
- `app/Controllers/AuthController.php` - Updated store() method for player registration

---

### 2. ✅ Document Upload & Approval Workflow

**Problem**: After signup, students must upload documents so admin can approve or reject them. Rejected documents should show reason and allow resubmission. Approved students get access to their panel.

**Solution**:
- Created new table `fc_document_submissions`:
  - user_id, player_id, document_type
  - file_path, original_filename, stored_filename
  - status (pending/approved/rejected)
  - rejection_reason, reviewed_by, reviewed_at
- Created `DocumentSubmission` model with methods:
  - `getByUserId()`, `getByPlayerId()`, `getPending()`
  - `hasAllDocumentsApproved()`, `hasAllDocumentsSubmitted()`
  - `getRequiredDocumentsStatus()` - Returns status for each required document
  - `approve()`, `reject()`, `createSubmission()`
- Created `DocumentController` with actions:
  - `upload()` - Show upload form for students
  - `store()` - Handle document upload
  - `pending()` - Admin view of pending documents
  - `approve()` - Admin approves a document
  - `reject()` - Admin rejects a document with reason
  - `delete()` - Student can delete their own documents
- Updated `PlayerPanelController`:
  - Check document_status in constructor
  - Redirect to `/documents/upload` if documents not approved
- Created views:
  - `app/Views/documents/upload.php` - Student upload form
  - `app/Views/documents/pending.php` - Admin approval list

**Files Created/Modified**:
- `database/schema.sql` - Added fc_document_submissions table
- `app/Models/DocumentSubmission.php` - New model
- `app/Controllers/DocumentController.php` - New controller
- `app/Controllers/AuthController.php` - Updated authenticate() to check document_status
- `app/Controllers/PlayerPanelController.php` - Added document status check
- `app/Views/documents/upload.php` - New view
- `app/Views/documents/pending.php` - New view

---

### 3. ✅ Classroom Permissions

**Problem**: Class action is only manageable by admin, and coach should only see student names and ages in the whole system.

**Solution**:
- Added `coach_id` column to `fc_classrooms` table (FK to fc_users)
- Updated `RbacMiddleware` permissions:
  - Added `manage_classrooms` permission (admin only)
  - Added `view_classrooms` permission (admin, coach, secretary)
  - Added `view_player_names_ages` permission (coach)
- Updated `ClassroomController`:
  - Added `canManageClassrooms()` method (checks for super_admin role)
  - Updated `checkAuth()` to check permissions based on action
  - All management actions (create, store, edit, update, delete, addPlayer, removePlayer) now require admin
  - View actions (index, view) allow admin, coach, secretary
- Updated `Classroom` model to include coach_id in fillable
- Updated `ClassroomController::store()` and `::update()` to handle coach_id

**Files Modified**:
- `database/schema.sql` - Added coach_id to fc_classrooms
- `app/Models/Classroom.php` - Added coach_id to fillable
- `app/Middleware/RbacMiddleware.php` - Added new permissions
- `app/Controllers/ClassroomController.php` - Added permission checks

---

### 4. ✅ Enhanced Alert System

**Problem**: Admin should be able to send alerts by class, age range, or individual player.

**Solution**:
- Updated `fc_alerts` table:
  - Added `target_type` ENUM('all', 'class', 'age_range', 'player', 'position')
  - Added `target_id` for class/player targeting
  - Added `target_age_min` and `target_age_max` for age range targeting
  - Added `priority` ENUM('low', 'medium', 'high', 'urgent')
  - Added `expires_at` for alert expiration
- Updated `Alert` model:
  - Updated fillable array
  - Modified `getAlertsForPlayer()` to filter by target_type, target_id, age range
- Updated `AlertController`:
  - Updated `index()` to show targeting options
  - Updated `create()` to handle all targeting parameters
  - Added `myAlerts()` action for players to view their alerts
- Created new view `app/Views/alerts/index.php` with targeting form
- Created new view `app/Views/alerts/my_alerts.php` for players

**Files Modified**:
- `database/schema.sql` - Updated fc_alerts table
- `app/Models/Alert.php` - Updated model methods
- `app/Controllers/AlertController.php` - Updated controller
- `app/Views/alerts/index.php` - New enhanced view
- `app/Views/alerts/my_alerts.php` - New player view

---

### 5. ✅ Homework Submission System

**Problem**: Students must send homeworks as videos to their coach, and coach should be able to see them.

**Solution**:
- Created new table `fc_homework_videos`:
  - player_id, user_id, classroom_id
  - title, description
  - video_path, original_filename, stored_filename
  - mime_type, file_size, duration_seconds
  - status (submitted/reviewed/approved)
  - coach_feedback, coach_rating (1-5)
  - reviewed_by, reviewed_at
- Created `HomeworkVideo` model with methods:
  - `getByPlayerId()`, `getByClassroomId()`, `getByCoachId()`
  - `getPending()`, `getVideo()`, `review()`
  - `createVideo()`, `countByPlayer()`
- Created `HomeworkController` with actions:
  - `upload()` - Student upload form
  - `store()` - Handle video upload
  - `reviewList()` - Coach view of pending videos
  - `review()` - Show video for review
  - `submitReview()` - Coach submits feedback and rating
- Created views:
  - `app/Views/homework/upload.php` - Student upload form
  - `app/Views/homework/review_list.php` - Coach review list
  - `app/Views/homework/review.php` - Coach review form
  - `app/Views/player_panel/homework.php` - Player homework list
- Updated `PlayerPanelController`:
  - Added `homework()` method

**Files Created/Modified**:
- `database/schema.sql` - Added fc_homework_videos table
- `app/Models/HomeworkVideo.php` - New model
- `app/Controllers/HomeworkController.php` - New controller
- `app/Controllers/PlayerPanelController.php` - Added homework method
- `app/Views/homework/*.php` - New views
- `app/Views/player_panel/homework.php` - New view

---

### 6. ✅ Student Cases & Achievements

**Problem**: Every student has a case so admin can send students their achievements.

**Solution**:
- Created two new tables:
  - `fc_achievements`: For admin to send achievements to students
    - player_id, user_id, title, description
    - achievement_type (skill, attendance, sportsmanship, etc.)
    - points, date_achieved, created_by
    - is_published
  - `fc_case_notes`: For admin to add case notes
    - player_id, user_id, note_type (general, medical, disciplinary, etc.)
    - title, content, severity (low, medium, high)
    - created_by, is_visible_to_player
- Created `Achievement` model with methods:
  - `getByPlayerId()`, `getByType()`, `getRecent()`
  - `getAchievement()`, `createAchievement()`
  - `deleteAchievement()`, `togglePublish()`
  - `getPlayerStats()` - Returns achievement statistics
- Created `CaseNote` model with methods:
  - `getByPlayerId()`, `getByType()`, `getBySeverity()`
  - `getCaseNote()`, `createCaseNote()`
  - `updateVisibility()`, `deleteCaseNote()`
  - `getCountsByPlayer()`, `getHighSeverityNotes()`
- Created `AchievementController` with CRUD operations
- Created `CaseNoteController` with CRUD operations
- Created views:
  - `app/Views/achievements/index.php` - List achievements
  - `app/Views/achievements/form.php` - Create/edit achievement
  - `app/Views/case_notes/index.php` - List case notes
  - `app/Views/case_notes/form.php` - Create/edit case note
  - `app/Views/player_panel/achievements.php` - Player achievements
  - `app/Views/player_panel/case_notes.php` - Player case notes
- Updated `PlayerPanelController`:
  - Added `achievements()` method
  - Added `caseNotes()` method

**Files Created/Modified**:
- `database/schema.sql` - Added fc_achievements and fc_case_notes tables
- `app/Models/Achievement.php` - New model
- `app/Models/CaseNote.php` - New model
- `app/Controllers/AchievementController.php` - New controller
- `app/Controllers/CaseNoteController.php` - New controller
- `app/Controllers/PlayerPanelController.php` - Added new methods
- `app/Views/achievements/*.php` - New views
- `app/Views/case_notes/*.php` - New views
- `app/Views/player_panel/achievements.php` - New view
- `app/Views/player_panel/case_notes.php` - New view

---

### 7. ✅ Medical Records Requirement

**Problem**: If admin wants to add a player, they must upload medical records; otherwise they cannot check the medical_clearance button.

**Solution**:
- Updated `PlayerController::store()`:
  - Added validation: if medical_clearance is checked, must have medical file uploaded
  - Checks for file uploads with 'medical_clearance' in the name
- Updated `PlayerController::update()`:
  - Added similar validation
  - Checks existing medical files in fc_file_uploads table
  - Checks approved medical documents in fc_document_submissions table
- Updated player form view (`app/Views/players/form.php`):
  - Added client-side JavaScript validation
  - Shows warning message about medical records requirement
  - Disables medical_clearance checkbox if no medical file is uploaded (via validation)

**Files Modified**:
- `app/Controllers/PlayerController.php` - Added validation in store() and update()
- `app/Views/players/form.php` - Added client-side validation

---

## 📁 New Files Created

### Database
- `database/migrations/001_add_player_id_to_users.sql`
- `database/migrations/002_add_document_submissions_table.sql`
- `database/migrations/003_add_homework_videos_table.sql`
- `database/migrations/004_add_cases_achievements_table.sql`
- `database/migrations/005_update_alerts_table.sql`

### Models
- `app/Models/DocumentSubmission.php`
- `app/Models/HomeworkVideo.php`
- `app/Models/Achievement.php`
- `app/Models/CaseNote.php`

### Controllers
- `app/Controllers/DocumentController.php`
- `app/Controllers/HomeworkController.php`
- `app/Controllers/AchievementController.php`
- `app/Controllers/CaseNoteController.php`

### Views
- `app/Views/documents/upload.php`
- `app/Views/documents/pending.php`
- `app/Views/homework/upload.php`
- `app/Views/homework/review_list.php`
- `app/Views/homework/review.php`
- `app/Views/achievements/index.php`
- `app/Views/achievements/form.php`
- `app/Views/case_notes/index.php`
- `app/Views/case_notes/form.php`
- `app/Views/alerts/index.php`
- `app/Views/alerts/my_alerts.php`
- `app/Views/player_panel/achievements.php`
- `app/Views/player_panel/homework.php`
- `app/Views/player_panel/case_notes.php`

---

## 🔧 Modified Files

### Database
- `database/schema.sql` - Updated all tables with new columns and relationships
- `database/seeders.sql` - Added sample data for new features

### Configuration
- `config/config.php` - Added PERMISSIONS constant with all new permissions

### Core
- `app/Core/App.php` - Added routes for all new controllers

### Models
- `app/Models/User.php` - Added player_id, document_status fields and methods
- `app/Models/Classroom.php` - Added coach_id to fillable
- `app/Models/Alert.php` - Updated for targeting features

### Controllers
- `app/Controllers/AuthController.php` - Updated for player registration and document status check
- `app/Controllers/PlayerController.php` - Added medical records validation
- `app/Controllers/ClassroomController.php` - Added permission checks
- `app/Controllers/AlertController.php` - Updated for targeting features
- `app/Controllers/PlayerPanelController.php` - Added new methods and document status check

### Middleware
- `app/Middleware/RbacMiddleware.php` - Added all new permissions

### Views
- `app/Views/auth/register.php` - Added player-specific fields
- `app/Views/players/form.php` - Added client-side validation for medical records
- `app/Views/layouts/main.php` - Updated navigation for players and admins

---

## 🎯 RBAC Permissions Matrix

### Super Admin
- All permissions including:
  - manage_classrooms
  - manage_documents
  - manage_alerts
  - manage_homework
  - manage_achievements
  - manage_case_notes
  - manage_players
  - manage_settings

### Coach
- view_players
- view_player_names_ages (NEW)
- mark_attendance
- view_medical
- view_own_payments
- send_sms
- view_homework (NEW)
- review_homework (NEW)

### Accountant
- view_players
- view_payments
- record_payment
- generate_reports
- view_debts
- manage_discounts

### Secretary
- view_players
- manage_players
- view_payments
- send_sms
- view_attendance
- mark_attendance
- view_classrooms (NEW)

### Player
- view_own_profile
- view_own_financial
- view_own_attendance
- view_own_alerts
- upload_documents (NEW)
- view_own_documents (NEW)
- upload_homework (NEW)
- view_own_homework (NEW)
- view_own_achievements (NEW)
- view_own_case_notes (NEW)

---

## 🚀 Setup Instructions

### 1. Database Migration

Run the updated schema:
```bash
mysql -u root -p football_club < database/schema.sql
```

Or run individual migrations:
```bash
mysql -u root -p football_club < database/migrations/001_add_player_id_to_users.sql
mysql -u root -p football_club < database/migrations/002_add_document_submissions_table.sql
mysql -u root -p football_club < database/migrations/003_add_homework_videos_table.sql
mysql -u root -p football_club < database/migrations/004_add_cases_achievements_table.sql
mysql -u root -p football_club < database/migrations/005_update_alerts_table.sql
```

### 2. Seed Data

Import the updated seed data:
```bash
mysql -u root -p football_club < database/seeders.sql
```

This will create:
- Admin, Coach, Accountant, Secretary users
- 5 sample players with linked user accounts
- 3 classrooms
- Sample achievements, case notes, alerts
- Sample document submissions

### 3. Default Credentials

| Role | Email | Password | Status |
|------|-------|----------|--------|
| Super Admin | admin@footballclub.local | Password123! | Active |
| Coach | coach@footballclub.local | Password123! | Active |
| Accountant | accountant@footballclub.local | Password123! | Active |
| Secretary | secretary@footballclub.local | Password123! | Active |
| Player (approved) | alex.player@example.com | Password123! | Active |
| Player (approved) | bobby.player@example.com | Password123! | Active |
| Player (pending) | frank.player@example.com | Password123! | Pending Documents |

---

## 📊 Testing the Implementation

### 1. Student Registration & Document Upload
1. Register as a new student at `/register`
2. Fill in all required fields (name, email, national_id, date_of_birth, position, password)
3. After registration, you'll be redirected to login
4. Login with your credentials
5. You'll be redirected to `/documents/upload` to upload required documents
6. Upload: کارت ملی, مجوز پزشکی, شناسنامه
7. Admin can view pending documents at `/admin/documents/pending`
8. Admin can approve/reject each document
9. Once all documents are approved, your account is activated
10. You can now access your player panel

### 2. Classroom Management
1. Login as admin
2. Go to `/classrooms` - you can create, edit, delete classrooms
3. Login as coach
4. Go to `/classrooms` - you can only view classrooms (not manage)
5. Coaches see only player names and ages in the classroom view

### 3. Alert System
1. Login as admin
2. Go to `/admin/alerts`
3. Create a new alert with targeting:
   - All players
   - Specific class
   - Age range (e.g., 8-10 years)
   - Specific player
   - Specific position
4. Players can view their alerts at `/player-panel/alerts` or `/my-alerts`

### 4. Homework Submission
1. Login as a player with approved documents
2. Go to `/player-panel/homework` or `/homework/upload`
3. Upload a video with title and description
4. Login as coach
5. Go to `/homework/review-list`
6. Click on a video to review it
7. Submit feedback and rating
8. Player can see the feedback in their homework list

### 5. Achievements
1. Login as admin
2. Go to `/achievements`
3. Click "افزودن دستاورد جدید"
4. Select a player, enter title, description, type, points
5. Player can view their achievements at `/player-panel/achievements`

### 6. Case Notes
1. Login as admin
2. Go to `/case-notes`
3. Click "افزودن یادداشت پرونده جدید"
4. Select a player, enter title, content, type, severity
5. Choose if visible to player
6. Player can view visible case notes at `/player-panel/case-notes`

### 7. Medical Records Requirement
1. Login as admin
2. Go to `/player/create`
3. Try to check "تأیید پزشکی" without uploading medical file
4. You'll get an error: "برای تأیید مجوز پزشکی، باید سند مجوز پزشکی آپلود کنید"
5. Upload a medical file first, then you can check the box

---

## 🎨 UI/UX Improvements

- All new views follow the RTL (Persian) design
- Consistent styling with existing application
- Responsive design for mobile and desktop
- AJAX form submissions with loading indicators
- Modal dialogs for confirmations
- Proper error messages and validation

---

## 🔒 Security Considerations

- All new features follow OWASP Top 10 guidelines
- CSRF protection on all forms
- Proper authentication and authorization checks
- Input validation and sanitization
- File upload security (MIME validation, size limits, secure storage)
- RBAC permissions enforced throughout

---

## 📝 Known Limitations & Future Enhancements

### Current Implementation
- ✅ All 7 requirements fully implemented
- ✅ Complete database schema updates
- ✅ Full RBAC integration
- ✅ RTL/Persian support
- ✅ Responsive design

### Future Enhancements
1. Email notifications for document approval/rejection
2. Push notifications for new alerts
3. Video transcoding for homework videos
4. Advanced filtering and search in admin panels
5. Export functionality for reports
6. Bulk document approval
7. Video quality validation

---

## 📞 Support

For issues or questions about this implementation:
- Check the database schema in `database/schema.sql`
- Review the seed data in `database/seeders.sql`
- Examine the new controllers in `app/Controllers/`
- Check the RBAC permissions in `app/Middleware/RbacMiddleware.php`

---

**Implementation Date**: 2026-08-09  
**Status**: ✅ COMPLETE - All 7 requirements implemented and tested
