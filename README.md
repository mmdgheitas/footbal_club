# Football Club Management System

A comprehensive, production-ready Football Club Management System built with **Pure PHP (MVC)** following **PSR-12** standards, **OWASP Top 10** security guidelines, and **Clean Code** principles.

## Features

### 1. **Player Management**
- Complete player profiles with guardian information
- National ID and medical clearance tracking
- Date of birth-based age category auto-calculation (U8-Senior)
- Secure file uploads (ID, insurance, medical clearances)
- Injury history tracking
- Player statistics and search functionality

### 2. **Financial Engine**
- Tuition payment tracking with multiple payment methods
- Double-entry bookkeeping transaction logs
- Outstanding debt calculation and reporting
- Monthly revenue analysis with yearly trends
- PDF-ready receipt generation
- Discount management (fixed and percentage-based)

### 3. **Attendance Management**
- AJAX-based attendance grid for daily sessions
- Status tracking: Present, Absent, Excused, Late
- Per-player attendance percentage calculation
- Low attendance warnings (customizable threshold)
- Attendance reports per player

### 4. **Medical & Health**
- Restricted access medical records (Admin and Coach only)
- Blood type, allergies, medical conditions tracking
- Vaccination status management
- Injury history with severity levels
- Regular exam scheduling and notes

### 5. **RBAC System**
- Four role levels: SuperAdmin, Coach, Accountant, Secretary
- Granular permission-based access control
- Middleware for permission enforcement
- Activity audit logging

### 6. **Communication Hub**
- Multi-provider SMS integration (Twilio, Nexmo, Mock)
- Group SMS to parents/guardians
- Tuition reminders and absence alerts
- SMS delivery status tracking
- SMS log history and analytics

### 7. **Admin Dashboard**
- Real-time statistics and KPIs
- Revenue charts and trends
- Player demographics
- Outstanding debts overview
- System settings management

## Technology Stack

- **Backend**: Pure PHP 8.0+ with MVC architecture
- **Database**: MySQL 8.0+ / MariaDB with InnoDB
- **Security**: PSR-12, OWASP Top 10, PDO prepared statements
- **Frontend**: Vanilla JavaScript (ES6+), CSS3
- **Architecture**: Singleton pattern, Factory pattern, Dependency Injection

## Directory Structure

```
football-club-management/
├── app/
│   ├── Controllers/        # Request handlers
│   ├── Models/            # Database models
│   ├── Views/             # Template files
│   ├── Core/              # Framework core (App, Router, Database, etc.)
│   ├── Helpers/           # Security, SMS providers, utilities
│   └── Middleware/        # Auth and RBAC
├── public/
│   ├── index.php          # Entry point
│   ├── .htaccess          # URL rewriting
│   ├── assets/
│   │   ├── css/          # Stylesheets
│   │   └── js/           # JavaScript files
│   └── uploads/          # User uploads
├── config/
│   ├── config.php         # Application configuration
│   └── database.php       # Database configuration
├── database/
│   ├── schema.sql         # Database schema
│   └── seeders.sql        # Seed data
└── README.md

```

## Setup Instructions

### Prerequisites

- PHP 8.0 or higher
- MySQL 8.0 or MariaDB 10.5+
- Apache with `mod_rewrite` enabled
- Composer (optional, for dependency management)

### Installation

1. **Clone or Extract the Project**
```bash
cd /path/to/project
```

2. **Configure Environment Variables**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

3. **Database Setup**
```bash
# Import the schema
mysql -u root -p football_club < database/schema.sql

# (Optional) Import seed data
mysql -u root -p football_club < database/seeders.sql
```

4. **Update Configuration**
Edit `config/config.php` and `config/database.php`:
```php
define('APP_DEBUG', false); // Set to false in production
define('APP_ENV', 'production');
```

5. **Set File Permissions**
```bash
chmod 755 app
chmod 755 public
chmod 755 public/uploads
chmod 755 database
```

6. **Configure Web Server**

**For Apache (using .htaccess):**
- Ensure `mod_rewrite` is enabled
- DocumentRoot should point to `/public` directory

**Virtual Host Example:**
```apache
<VirtualHost *:80>
    ServerName football-club.local
    DocumentRoot /path/to/project/public

    <Directory /path/to/project/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

7. **Start Using the System**
- Navigate to `http://localhost` (or your configured domain)
- Default login credentials:
  - Email: `admin@footballclub.local`
  - Password: `Password123!` (bcrypt hashed with cost 12)

## Default Users

After running seeders.sql, the following users are available:

| Email | Password | Role |
|-------|----------|------|
| admin@footballclub.local | Password123! | SuperAdmin |
| coach@footballclub.local | Password123! | Coach |
| accountant@footballclub.local | Password123! | Accountant |
| secretary@footballclub.local | Password123! | Secretary |

**⚠️ Security Note**: Change all default passwords immediately in production!

## Security Features

### OWASP Top 10 Mitigation

1. **SQL Injection Prevention**
   - PDO prepared statements for all queries
   - Parameter binding
   - Input validation

2. **Cross-Site Scripting (XSS) Prevention**
   - HTML entity encoding for all output
   - Content Security Policy headers
   - Input sanitization

3. **Cross-Site Request Forgery (CSRF) Protection**
   - CSRF tokens in all forms
   - Token validation on POST requests
   - SameSite cookie attribute

4. **Authentication & Session Management**
   - Bcrypt password hashing (cost 12)
   - Session timeout with configurable lifetime
   - IP address verification
   - User agent checking

5. **File Upload Security**
   - MIME type validation
   - File extension whitelisting
   - UUID-based filename generation
   - Secure file storage outside web root

6. **Authorization**
   - Role-Based Access Control (RBAC)
   - Permission middleware
   - Resource-level access checks

7. **Error Handling**
   - No sensitive information in error messages
   - Error logging to file
   - Proper HTTP status codes

8. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: SAMEORIGIN
   - X-XSS-Protection: 1; mode=block
   - Referrer-Policy: strict-origin-when-cross-origin

## API Routes

### Authentication
```
GET  /login           - Login form
POST /login           - Authenticate user
GET  /logout          - Logout user
GET  /register        - Registration form
POST /register        - Create new account
```

### Players
```
GET    /players                 - List all players
GET    /player/create           - Add player form
POST   /player/store            - Create new player
GET    /player/edit/{id}        - Edit player form
POST   /player/update/{id}      - Update player
GET    /player/view/{id}        - View player details
POST   /player/delete/{id}      - Delete player
```

### Financial
```
GET  /payments                  - List payments
POST /payment/record            - Record payment
GET  /payment/receipt/{id}      - Generate receipt
GET  /reports/financial         - Financial report
GET  /reports/debts             - Outstanding debts report
```

### Attendance
```
GET  /attendance                - Attendance grid
POST /attendance/mark           - Mark attendance (AJAX)
GET  /attendance/report/{id}    - Player attendance report
```

### Medical
```
GET  /medical                   - Medical records list
GET  /medical/view/{id}         - View medical record
POST /medical/update/{id}       - Update medical record
```

### SMS
```
GET  /sms/send                  - Send SMS form
POST /sms/send                  - Send SMS
GET  /sms/logs                  - SMS logs
```

### Admin
```
GET  /admin/users               - User management
GET  /admin/settings            - System settings
POST /admin/settings            - Update settings
```

## Configuration Guide

### SMS Provider Setup

**1. Using Twilio:**
```php
// .env
SMS_PROVIDER=twilio
SMS_API_KEY=your_twilio_account_sid
SMS_API_SECRET=your_twilio_auth_token
SMS_FROM_NUMBER=+1234567890
```

**2. Using Nexmo (Vonage):**
```php
// .env
SMS_PROVIDER=nexmo
SMS_API_KEY=your_nexmo_api_key
SMS_API_SECRET=your_nexmo_api_secret
SMS_FROM_NUMBER=YourBrand
```

**3. Using Mock Provider (Development):**
```php
// .env
SMS_PROVIDER=mock
// Logs SMS to file instead of sending
```

### Custom SMS Provider

Create a new provider class extending `SmsProvider`:

```php
namespace App\Helpers;

class CustomSmsProvider extends SmsProvider
{
    public function send(string $toNumber, string $message): array
    {
        // Implementation here
    }

    public function checkStatus(string $messageId): string
    {
        // Implementation here
    }
}
```

### Database Customization

Edit `config/database.php` to switch between MySQL and SQLite:

```php
'default' => 'mysql', // or 'sqlite'

'connections' => [
    'mysql' => [
        'host' => 'localhost',
        'port' => 3306,
        'database' => 'football_club',
        // ...
    ],
    'sqlite' => [
        'database' => BASE_PATH . '/database/football_club.db',
    ],
]
```

## Development

### Running Tests

**Test SQL Injection Protection:**
```
Navigate to login and try:
Email: ' OR '1'='1
Password: test
# Should fail - SQL injection prevented
```

**Test XSS Protection:**
```
Create a player with name: <script>alert('XSS')</script>
# Should be escaped and displayed safely
```

**Test CSRF Protection:**
```
Attempt a POST request without _csrf_token
# Should receive 403 Forbidden
```

### Adding New Features

1. **Create a Model** in `app/Models/YourModel.php`
2. **Create a Controller** in `app/Controllers/YourController.php`
3. **Register Routes** in `app/Core/App.php`
4. **Create Views** in `app/Views/your-feature/`
5. **Test thoroughly** before deployment

### Code Standards

This project follows:
- **PSR-12**: Extended Coding Style Guide
- **PSR-4**: Autoloading Standard
- **Clean Code** principles by Robert C. Martin
- **SOLID** principles

## Troubleshooting

### Database Connection Failed
```
Error: "Database connection failed"
Solution: 
- Check credentials in config/database.php
- Ensure MySQL is running
- Verify database exists
```

### 404 Not Found Errors
```
Error: "404 - Page Not Found"
Solution:
- Ensure .htaccess is enabled
- Check Apache mod_rewrite is enabled
- Verify DocumentRoot points to /public
```

### File Upload Issues
```
Error: "File size exceeds maximum"
Solution:
- Edit config/config.php MAX_FILE_SIZE
- Update php.ini upload_max_filesize
```

### Session Issues
```
Error: "Session expired"
Solution:
- Clear browser cookies
- Restart browser
- Check PHP session storage permissions
```

## Performance Optimization

### Database Queries
- All queries use prepared statements
- Indexes on frequently queried columns
- Query optimization for reports

### Caching
- Implement query result caching for reports
- Use browser caching for static assets

### Compression
- Enable gzip compression in .htaccess
- Minify CSS and JavaScript in production

## Backup & Recovery

### Backup Database
```bash
mysqldump -u root -p football_club > backup.sql
```

### Restore Database
```bash
mysql -u root -p football_club < backup.sql
```

### Backup Files
```bash
tar -czf backup.tar.gz app/ public/ config/ database/
```

## Production Checklist

- [ ] Set `APP_DEBUG = false`
- [ ] Update all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure proper error logging
- [ ] Set up database backups
- [ ] Configure firewall rules
- [ ] Review RBAC permissions
- [ ] Test all SMS providers
- [ ] Set up monitoring/alerts
- [ ] Create disaster recovery plan

## Support & Documentation

### Core Classes

**App.php** - Application kernel and routing
**Router.php** - URL routing and dispatching
**Database.php** - PDO database wrapper
**Controller.php** - Base controller class
**Model.php** - Base model class

### Middleware

**AuthMiddleware.php** - Authentication checks
**RbacMiddleware.php** - Permission enforcement

### Helpers

**SecurityHelper.php** - Security utilities (XSS, SQLi, CSRF protection)
**SmsProvider.php** - SMS provider abstraction

## License

This project is provided as-is for educational and commercial use.

## Contributing

Bug reports and feature requests welcome!

## Version

**v1.0.0** - Initial Release

---

**Built with ❤️ using Pure PHP**
