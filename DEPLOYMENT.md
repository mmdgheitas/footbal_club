# Deployment Guide - Football Club Management System

## Pre-Deployment Checklist

- [ ] Review all security configurations
- [ ] Test database backups
- [ ] Configure error logging
- [ ] Set up monitoring
- [ ] Review RBAC permissions
- [ ] Test all SMS providers
- [ ] Configure SSL/HTTPS
- [ ] Set up firewall rules
- [ ] Create disaster recovery plan

## Production Deployment Steps

### 1. Environment Preparation

**Transfer Files**
```bash
# Using SCP
scp -r /path/to/project user@server.com:/var/www/

# Using FTP/SFTP
sftp> put -r /path/to/project /var/www/
```

**Set Directory Permissions**
```bash
ssh user@server.com
cd /var/www/football-club

# Set ownership
sudo chown -R www-data:www-data .

# Set permissions
chmod 755 app public config
chmod 755 public/uploads
chmod 755 database
chmod 644 app/**/*.php
chmod 644 public/index.php
```

### 2. Web Server Configuration

**Apache Virtual Host**
```apache
<VirtualHost *:80>
    ServerName football-club.example.com
    ServerAlias www.football-club.example.com
    DocumentRoot /var/www/football-club/public

    # Enable mod_rewrite
    <Directory /var/www/football-club/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Deny access to sensitive directories
    <Directory /var/www/football-club/app>
        Require all denied
    </Directory>

    <Directory /var/www/football-club/config>
        Require all denied
    </Directory>

    <Directory /var/www/football-club/database>
        Require all denied
    </Directory>

    # Enable gzip compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
    </IfModule>

    # Set security headers
    <IfModule mod_headers.c>
        Header set X-Content-Type-Options "nosniff"
        Header set X-Frame-Options "SAMEORIGIN"
        Header set X-XSS-Protection "1; mode=block"
        Header set Referrer-Policy "strict-origin-when-cross-origin"
    </IfModule>

    ErrorLog ${APACHE_LOG_DIR}/football-club-error.log
    CustomLog ${APACHE_LOG_DIR}/football-club-access.log combined
</VirtualHost>
```

**Nginx Configuration**
```nginx
server {
    listen 80;
    server_name football-club.example.com www.football-club.example.com;

    root /var/www/football-club/public;
    index index.php;

    # Deny access to sensitive directories
    location ~ ^/(app|config|database)/ {
        deny all;
    }

    # Rewrite rules
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP handling
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Gzip compression
    gzip on;
    gzip_types text/html text/plain text/xml text/css text/javascript application/javascript;

    # Security headers
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Logging
    access_log /var/log/nginx/football-club-access.log;
    error_log /var/log/nginx/football-club-error.log;
}
```

### 3. SSL/HTTPS Configuration

**Using Let's Encrypt with Certbot**
```bash
sudo certbot certonly --apache -d football-club.example.com -d www.football-club.example.com

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

**Force HTTPS Redirect (Apache)**
```apache
<VirtualHost *:80>
    ServerName football-club.example.com
    Redirect permanent / https://football-club.example.com/
</VirtualHost>
```

**Force HTTPS Redirect (Nginx)**
```nginx
server {
    listen 80;
    server_name football-club.example.com;
    return 301 https://$server_name$request_uri;
}
```

### 4. Database Setup

**Connect to Server**
```bash
ssh user@server.com
```

**Create Database**
```bash
mysql -u root -p
```

```sql
CREATE DATABASE football_club CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fcapp'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON football_club.* TO 'fcapp'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Import Schema**
```bash
mysql -u fcapp -p football_club < /var/www/football-club/database/schema.sql
```

**Import Seed Data (Optional)**
```bash
mysql -u fcapp -p football_club < /var/www/football-club/database/seeders.sql
```

### 5. Environment Configuration

**Copy and Edit .env**
```bash
cp /var/www/football-club/.env.example /var/www/football-club/.env
sudo nano /var/www/football-club/.env
```

**Required Settings**
```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://football-club.example.com

DB_HOST=localhost
DB_NAME=football_club
DB_USER=fcapp
DB_PASSWORD=strong_password_here

SMS_PROVIDER=twilio
SMS_API_KEY=your_twilio_sid
SMS_API_SECRET=your_twilio_token
SMS_FROM_NUMBER=+1234567890
```

### 6. Error Logging Setup

**Create Log Directory**
```bash
mkdir -p /var/www/football-club/storage/logs
chmod 755 /var/www/football-club/storage/logs
```

**Configure PHP Error Logging**
```bash
# Edit /etc/php/8.x/fpm/php.ini
error_log = /var/www/football-club/storage/logs/php-error.log
```

### 7. Backup Configuration

**Automated Daily Backup Script**
```bash
#!/bin/bash
# Save as /usr/local/bin/backup-football-club.sh

BACKUP_DIR="/backups/football-club"
DATE=$(date +%Y%m%d_%H%M%S)
DB_USER="fcapp"
DB_PASS="strong_password"
DB_NAME="football_club"

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/football-club

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Schedule with Cron**
```bash
crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-football-club.sh
```

### 8. Monitoring Setup

**Monitor Disk Space**
```bash
# Install Nagios or Zabbix
sudo apt-get install nagios3
```

**Monitor Application Logs**
```bash
# Using Logwatch
sudo apt-get install logwatch
```

**Monitor Database**
```bash
# Enable slow query log
mysql -u root -p
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

### 9. Security Hardening

**Update Firewall Rules**
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

**Disable Unnecessary Services**
```bash
# Disable unnecessary PHP modules
sudo phpdismod xml xmlrpc
```

**Regular Security Updates**
```bash
# Enable automatic updates
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 10. Performance Optimization

**Enable OpCache**
```bash
# Edit /etc/php/8.x/fpm/php.ini
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=100000
```

**Configure Session Handler**
```bash
# Use Redis for sessions (recommended)
sudo apt-get install redis-server
```

**Database Optimization**
```sql
-- Analyze tables
ANALYZE TABLE fc_players;
ANALYZE TABLE fc_payments;
ANALYZE TABLE fc_attendance;

-- Optimize tables
OPTIMIZE TABLE fc_players;
OPTIMIZE TABLE fc_payments;
OPTIMIZE TABLE fc_attendance;
```

### 11. Verification Steps

**Test Application Access**
```bash
curl https://football-club.example.com/login
# Should return login page HTML
```

**Test Database Connection**
```bash
mysql -u fcapp -p football_club -e "SELECT COUNT(*) FROM fc_players;"
```

**Test File Uploads**
```bash
# Upload a test file via web interface
# Verify file is stored in public/uploads/
```

**Test SMS Provider**
```php
// Test script in app/tests/test-sms.php
$provider = new \App\Helpers\TwilioSmsProvider();
$result = $provider->send('+1234567890', 'Test message');
echo json_encode($result);
```

## Production Maintenance

### Daily Tasks
- Monitor error logs
- Check disk space
- Verify backup completion
- Monitor website uptime

### Weekly Tasks
- Review slow query log
- Check for security updates
- Verify RBAC configurations
- Test disaster recovery

### Monthly Tasks
- Full database optimization
- Security audit
- Performance review
- Capacity planning

### Quarterly Tasks
- Database integrity check
- Full backup restoration test
- Security penetration testing
- Compliance audit

## Rollback Procedure

**If Deployment Fails**
```bash
# Restore previous version
cd /var/www
rm -rf football-club
tar -xzf /backups/football-club_previous.tar.gz

# Restore database
mysql -u root -p football_club < /backups/football-club_previous.sql

# Restart services
sudo systemctl restart php-fpm
sudo systemctl restart nginx
```

## Support Contacts

- **Technical Support**: support@example.com
- **Security Issues**: security@example.com
- **Emergency**: +1-800-555-0000

## Post-Deployment Verification

```bash
# Check application status
curl -I https://football-club.example.com/

# Check database
mysql -u fcapp -p football_club -e "SELECT VERSION();"

# Check PHP configuration
php -r "phpinfo();" | grep "PHP Version"

# Verify SSL certificate
openssl s_client -connect football-club.example.com:443

# Check disk usage
df -h /var/www/football-club

# Monitor processes
top -p $(pgrep -f "php-fpm|nginx" | tr '\n' ',')
```

---

**Deployment Completed Successfully!**

Your Football Club Management System is now live and ready for use.
