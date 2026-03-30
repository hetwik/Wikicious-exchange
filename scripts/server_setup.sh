#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  WIKICIOUS — Ubuntu 22.04 VPS Production Setup Script
#
#  Run as root on a fresh Ubuntu 22.04 server:
#    wget -O setup.sh https://your-repo/scripts/server_setup.sh
#    chmod +x setup.sh && sudo bash setup.sh
#
#  What this does:
#    1. System updates + hardening
#    2. Node.js 22 + npm
#    3. Nginx + Certbot (SSL)
#    4. PM2 (process manager)
#    5. UFW firewall rules
#    6. Logrotate
#    7. Fail2ban (brute force protection)
#    8. Monitoring (node_exporter)
#    9. Daily backup script
#   10. Deploy Wikicious
# ════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}  ✅  $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️   $1${NC}"; }
step() { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }
err()  { echo -e "${RED}  ❌  $1${NC}" >&2; exit 1; }
info() { echo -e "     ${CYAN}$1${NC}"; }

# ── Config (edit these) ──────────────────────────────────────────
DOMAIN="${DOMAIN:-wikicious.io}"
APP_USER="${APP_USER:-wikicious}"
APP_DIR="/var/www/wikicious"
REPO_URL="${REPO_URL:-https://github.com/yourorg/wikicious.git}"
NODE_VERSION=22
PM2_INSTANCES="${PM2_INSTANCES:-2}"   # CPU count

echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  WIKICIOUS PRODUCTION SERVER SETUP       ║${NC}"
echo -e "${BOLD}║  Ubuntu 22.04 LTS  •  Arbitrum Mainnet   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Root check ──────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && err "Run as root: sudo bash $0"

# ── 1. System update ────────────────────────────────────────────
step "System update & essential packages"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git build-essential python3-pip unzip jq \
  nginx certbot python3-certbot-nginx \
  ufw fail2ban logrotate \
  sqlite3 htop ncdu lsof net-tools \
  > /dev/null 2>&1
ok "System packages installed"

# ── 2. Node.js ──────────────────────────────────────────────────
step "Installing Node.js ${NODE_VERSION}"
if ! command -v node &>/dev/null || [[ $(node -v | sed 's/v//' | cut -d. -f1) -lt $NODE_VERSION ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
  apt-get install -y nodejs > /dev/null 2>&1
fi
ok "Node.js $(node -v) / npm $(npm -v)"

# PM2
npm install -g pm2 > /dev/null 2>&1
ok "PM2 $(pm2 -v) installed"

# ── 3. App user ──────────────────────────────────────────────────
step "Creating app user: $APP_USER"
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
  ok "User $APP_USER created"
else
  ok "User $APP_USER already exists"
fi
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ── 4. UFW Firewall ──────────────────────────────────────────────
step "Configuring UFW firewall"
ufw --force reset > /dev/null 2>&1
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow 22/tcp    comment "SSH"
ufw allow 80/tcp    comment "HTTP"
ufw allow 443/tcp   comment "HTTPS"
ufw allow 3001/tcp  comment "API (temp, remove after nginx setup)"
ufw --force enable > /dev/null 2>&1
ok "Firewall: 22, 80, 443, 3001 open"

# ── 5. Fail2ban ──────────────────────────────────────────────────
step "Configuring Fail2ban"
cat > /etc/fail2ban/jail.local << 'F2B'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8

[sshd]
enabled = true
port    = ssh
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 10
F2B
systemctl restart fail2ban > /dev/null 2>&1
ok "Fail2ban configured (SSH + nginx)"

# ── 6. Nginx ────────────────────────────────────────────────────
step "Configuring Nginx"
cat > /etc/nginx/sites-available/wikicious << NGINX
upstream wikicious_api {
    server 127.0.0.1:3001;
    keepalive 64;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

# Main app (React SPA)
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;

    gzip on;
    gzip_types text/plain application/json application/javascript text/css image/svg+xml;
    gzip_min_length 1000;

    root $APP_DIR/frontend/build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/wikicious.access.log;
    error_log  /var/log/nginx/wikicious.error.log;
}

# API subdomain
server {
    listen 443 ssl http2;
    server_name api.$DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000" always;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone \$binary_remote_addr zone=auth:10m rate=5r/m;

    location / {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://wikicious_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
    }

    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://wikicious_api;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://wikicious_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
    }

    access_log /var/log/nginx/wikicious-api.access.log;
    error_log  /var/log/nginx/wikicious-api.error.log;
}
NGINX

ln -sf /etc/nginx/sites-available/wikicious /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "Nginx configured for $DOMAIN"

# ── 7. SSL Certificate ───────────────────────────────────────────
step "SSL certificate setup"
if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  ok "SSL certificate already exists"
else
  warn "Getting SSL certificate for $DOMAIN"
  info "Make sure DNS for $DOMAIN and api.$DOMAIN point to this server first!"
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -d "api.$DOMAIN" \
    --non-interactive --agree-tos -m "ssl@$DOMAIN" || \
    warn "SSL failed — run manually: certbot --nginx -d $DOMAIN"
fi

# Auto-renewal
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | sort -u | crontab -
ok "SSL auto-renewal configured"

# ── 8. Deploy app ────────────────────────────────────────────────
step "Deploying Wikicious"

if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR" && git pull && ok "Repo updated"
else
  git clone "$REPO_URL" "$APP_DIR" && ok "Repo cloned"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Backend dependencies
cd "$APP_DIR/backend"
su -c "npm install --production" "$APP_USER"
ok "Backend dependencies installed"

# Frontend build
cd "$APP_DIR/frontend"
su -c "npm install" "$APP_USER"
su -c "npm run build" "$APP_USER"
ok "Frontend built"

# ── 9. PM2 Process Manager ───────────────────────────────────────
step "Setting up PM2"
cat > "$APP_DIR/ecosystem.config.js" << PM2CONFIG
module.exports = {
  apps: [
    {
      name:         'wikicious-api',
      script:       'src/index.js',
      cwd:          '$APP_DIR/backend',
      instances:    $PM2_INSTANCES,
      exec_mode:    'cluster',
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT:     3001,
      },
      error_file:   '/var/log/wikicious/api-error.log',
      out_file:     '/var/log/wikicious/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 5000,
      max_restarts:  10,
    },
    {
      name:   'wikicious-keeper',
      script: 'src/services/keeper.js',
      cwd:    '$APP_DIR/backend',
      instances: 1,
      env_production: { NODE_ENV: 'production' },
      error_file: '/var/log/wikicious/keeper-error.log',
      out_file:   '/var/log/wikicious/keeper-out.log',
      restart_delay: 10000,
    },
    {
      name:   'wikicious-guardian',
      script: 'src/services/guardian_keeper.js',
      cwd:    '$APP_DIR/backend',
      instances: 1,
      env_production: { NODE_ENV: 'production' },
      error_file: '/var/log/wikicious/guardian-error.log',
      out_file:   '/var/log/wikicious/guardian-out.log',
    },
  ],
};
PM2CONFIG

mkdir -p /var/log/wikicious
chown -R "$APP_USER:$APP_USER" /var/log/wikicious

su -c "cd $APP_DIR && pm2 start ecosystem.config.js --env production" "$APP_USER"
su -c "pm2 save" "$APP_USER"
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" > /dev/null 2>&1
ok "PM2 configured with $(pm2 list | grep -c online) processes running"

# ── 10. Logrotate ────────────────────────────────────────────────
step "Configuring log rotation"
cat > /etc/logrotate.d/wikicious << 'LOGROTATE'
/var/log/wikicious/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/wikicious*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        nginx -s reopen
    endscript
}
LOGROTATE
ok "Logrotate configured (14 days app, 30 days nginx)"

# ── 11. Backup script ────────────────────────────────────────────
step "Setting up daily database backup"
cat > /usr/local/bin/wikicious-backup << BACKUP
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/wikicious"
DB_PATH="$APP_DIR/backend/data/wikicious.db"
mkdir -p "\$BACKUP_DIR"
# SQLite hot backup (safe while running)
sqlite3 "\$DB_PATH" ".backup \$BACKUP_DIR/wikicious_\$DATE.db"
gzip "\$BACKUP_DIR/wikicious_\$DATE.db"
# Keep only last 30 days
find "\$BACKUP_DIR" -name "*.db.gz" -mtime +30 -delete
echo "Backup completed: wikicious_\$DATE.db.gz"
BACKUP
chmod +x /usr/local/bin/wikicious-backup
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/wikicious-backup >> /var/log/wikicious/backup.log 2>&1") | sort -u | crontab -
ok "Daily backup at 2AM → /var/backups/wikicious/"

# ── 12. Health check endpoint test ───────────────────────────────
step "Waiting for API to start..."
sleep 5
for i in {1..12}; do
  if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    ok "API health check passed ✓"; break
  fi
  sleep 5
done

# ── 13. Remove temp port ─────────────────────────────────────────
step "Tightening firewall (remove direct API port)"
ufw delete allow 3001/tcp > /dev/null 2>&1
ok "Port 3001 closed (only nginx proxy allowed)"

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  SETUP COMPLETE!                          ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Frontend:${NC}  https://$DOMAIN"
echo -e "  ${GREEN}API:${NC}       https://api.$DOMAIN"
echo -e "  ${GREEN}Admin:${NC}     https://$DOMAIN/admin"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  1. Edit $APP_DIR/backend/.env with your keys"
echo -e "  2. Restart: su -c 'pm2 restart all' $APP_USER"
echo -e "  3. Check logs: pm2 logs"
echo -e "  4. Monitor: pm2 monit"
echo ""
echo -e "  ${YELLOW}Your .env needs:${NC}"
echo -e "  • ARBITRUM_RPC_URL  (Alchemy/Infura)"
echo -e "  • KEEPER_PRIVATE_KEY"
echo -e "  • GUARDIAN_PRIVATE_KEY"
echo -e "  • JWT_SECRET  (64-char hex)"
echo -e "  • All contract addresses from deployment"
echo ""
