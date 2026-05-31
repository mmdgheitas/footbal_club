# Quick Start Guide
## Football Club Management System - Get Running in 5 Minutes

### Prerequisites
- PHP 8.0+ installed
- MySQL 8.0+ or MariaDB 10.5+ running
- Apache with mod_rewrite enabled
- Basic command line knowledge

### Step 1: Extract Project (1 minute)
```bash
# Navigate to your web root
cd /var/www/html

# Extract or clone the project
# (assuming you have the project files)

# Verify structure
ls -la football-club/
# Should show: app, config, database, public, .env.example, README.md
```

### Step 2: Configure Database (2 minutes)
```bash
# Connect to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE football_club CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fcapp'@'localhost' IDENTIFIED BY 'YourPassword123!';
GRANT ALL PRIVILEGES ON football_club.* TO 'fcapp'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
mysql -u fcapp -p football_club < /var/www/html/football-club/database/schema.sql
# Enter password when prompted
```

### Step 3: Configure Environment (1 minute)
```bash
# Copy environment template
cp /var/www/html/football-club/.env.example /var/www/html/football-club/.env

# Edit configuration
nano /var/www/html/football-club/.env

# Update these values:
APP_URL=http://localhost/football-club
DB_HOST=localhost
DB_NAME=football_club
DB_USER=fcapp
DB_PASSWORD=YourPassword123!
SMS_PROVIDER=mock
```

### Step 4: Set Permissions (1 minute)
```bash
cd /var/www/html/football-club

# Set directory permissions
sudo chmod -R 755 app
sudo chmod -R 755 public
sudo chmod -R 755 database
sudo chmod -R 755 config

# Set ownership (if needed)
sudo chown -R www-data:www-data .
```

### Step 5: Import Sample Data (Optional, 1 minute)
```bash
mysql -u fcapp -p football_club < /var/www/html/football-club/database/seeders.sql
# Enter password when prompted

# This creates default users:
# Email: admin@footballclub.local | Password: Password123!
# Email: coach@footballclub.local | Password: Password123!
# Email: accountant@footballclub.local | Password: Password123!
# Email: secretary@footballclub.local | Password: Password123!
```

### Step 6: Configure Web Server

**For Apache:**
```bash
# Create virtual host
sudo nano /etc/apache2/sites-available/football-club.conf
```

**Paste this configuration:**
```apache
<VirtualHost *:80>
    ServerName football-club.local
    DocumentRoot /var/www/html/football-club/public

    <Directory /var/www/html/football-club/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    <Directory /var/www/html/football-club/app>
        Require all denied
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/football-club-error.log
    CustomLog ${APACHE_LOG_DIR}/football-club-access.log combined
</VirtualHost>
```

**Enable the site:**
```bash
sudo a2ensite football-club.conf
sudo a2enmod rewrite
sudo systemctl restart apache2
```

**Add to /etc/hosts:**
```bash
sudo nano /etc/hosts
# Add line:
127.0.0.1 football-club.local
```

### Step 7: Access Application
```
Open browser and navigate to:
http://football-club.local/

Or if using localhost:
http://localhost/football-club/public/

Login with:
Email: admin@footballclub.local
Password: Password123!
```

---

## Troubleshooting

### "404 Not Found"
- Verify .htaccess is in public/ directory
- Ensure mod_rewrite is enabled: `sudo a2enmod rewrite`
- Restart Apache: `sudo systemctl restart apache2`

### "Database connection failed"
- Check DB credentials in .env file
- Verify MySQL is running: `sudo systemctl status mysql`
- Test connection: `mysql -u fcapp -p football_club`

### "Permission denied" on uploads
```bash
# Fix permissions
sudo chown www-data:www-data /var/www/html/football-club/public/uploads
chmod 755 /var/www/html/football-club/public/uploads
```

### "Blank page" or errors
```bash
# Check error logs
tail -f /var/log/apache2/football-club-error.log

# Enable PHP error display (development only)
# Edit app/index.php and set:
define('APP_DEBUG', true);
```

---

## Default Users

After running seeders.sql, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@footballclub.local | Password123! |
| Coach | coach@footballclub.local | Password123! |
| Accountant | accountant@footballclub.local | Password123! |
| Secretary | secretary@footballclub.local | Password123! |

⚠️ **IMPORTANT**: Change these passwords immediately in production!

---

## Main Features Quick Access

| Feature | URL |
|---------|-----|
| Dashboard | /dashboard |
| Player Management | /players |
| Financial Reports | /reports/financial |
| Attendance Marking | /attendance |
| Medical Records | /medical |
| SMS Communication | /sms/send |
| Admin Panel | /admin/users |

---

## Directory Structure

```
football-club/
├── app/                 - Application code
│   ├── Controllers/     - Request handlers
│   ├── Models/          - Database models
│   ├── Views/           - HTML templates
│   ├── Core/            - Framework
│   ├── Middleware/      - Auth & RBAC
│   └── Helpers/         - Security & SMS
├── public/              - Web accessible
│   ├── index.php        - Entry point
│   ├── assets/          - CSS & JavaScript
│   └── uploads/         - File storage
├── config/              - Configuration
├── database/            - Database files
└── README.md            - Full documentation
```

---

## Next Steps

1. ✅ Application is running
2. 📖 Read README.md for full documentation
3. 🔒 Review security settings
4. 📱 Configure SMS provider
5. 📊 Add your club's data
6. 📤 Set up automated backups
7. 🚀 Deploy to production (see DEPLOYMENT.md)

---

## Support Resources

- **README.md** - Complete documentation
- **DEPLOYMENT.md** - Production deployment guide
- **PROJECT_COMPLETION_REPORT.md** - Technical details
- **FILE_INVENTORY.md** - File listing and sizes

---

**Your Football Club Management System is ready to use! 🎉**
