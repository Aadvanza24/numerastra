#!/bin/bash
# =============================================================================
# Numerastra — VPS Deployment Script
# Tested on: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS
# Run as root or sudo user on a fresh Hostinger KVM VPS
#
# Usage:
#   chmod +x deploy.sh
#   sudo ./deploy.sh
#
# What this does:
#   1. Updates system packages
#   2. Installs Node.js 22, PM2, Nginx, Certbot
#   3. Creates app user and directory structure
#   4. Clones your GitHub repo
#   5. Installs dependencies
#   6. Sets up Nginx and SSL
#   7. Starts the API with PM2
#   8. Configures PM2 to auto-start on reboot
# =============================================================================

set -euo pipefail   # exit on error, undefined vars, pipe failures

# ── Config — EDIT THESE ──────────────────────────────────────────────────────
DOMAIN="numerastra.com"
GITHUB_REPO="https://github.com/YOURUSERNAME/numerastra-api.git"
APP_USER="numerastra"
APP_DIR="/var/www/numerastra"
LOG_DIR="/var/log/numerastra"
EMAIL="your@email.com"   # For Let's Encrypt SSL notifications
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section() { echo -e "\n${GREEN}━━━ $1 ━━━${NC}"; }

# Must be root
[[ $EUID -ne 0 ]] && error "Run as root: sudo ./deploy.sh"

section "1. System update"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl wget git build-essential ufw
info "System updated"

section "2. Node.js 22"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node_version=$(node --version)
info "Node.js $node_version installed"

section "3. PM2"
npm install -g pm2 --quiet
pm2 --version &>/dev/null && info "PM2 installed"

section "4. Nginx"
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
info "Nginx installed and running"

section "5. Certbot (Let's Encrypt SSL)"
apt-get install -y certbot python3-certbot-nginx
info "Certbot installed"

section "6. Firewall"
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
info "Firewall configured (SSH + HTTP + HTTPS)"

section "7. App user and directories"
# Create dedicated app user (no login shell, no home directory login)
if ! id "$APP_USER" &>/dev/null; then
  useradd --system --no-create-home --shell /bin/false "$APP_USER"
fi

mkdir -p "$APP_DIR/api"
mkdir -p "$APP_DIR/public"
mkdir -p "$LOG_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$LOG_DIR"
info "Directories created at $APP_DIR"

section "8. Clone repository"
if [ -d "$APP_DIR/api/.git" ]; then
  warn "Repo already exists — pulling latest changes"
  sudo -u "$APP_USER" git -C "$APP_DIR/api" pull
else
  sudo -u "$APP_USER" git clone "$GITHUB_REPO" "$APP_DIR/api"
fi
info "Repository ready at $APP_DIR/api"

section "9. Install Node dependencies"
sudo -u "$APP_USER" bash -c "cd $APP_DIR/api && npm install --production"
info "Dependencies installed"

section "10. Environment file"
ENV_FILE="$APP_DIR/api/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" << 'ENVTEMPLATE'
NODE_ENV=production
PORT=3000

# ── Generate JWT_SECRET with: ──────────────────────────────────────────
# node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=REPLACE_ME

# ── Claude AI ──────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=REPLACE_ME

# ── MSG91 (India SMS) ──────────────────────────────────────────────────
MSG91_API_KEY=REPLACE_ME
MSG91_SENDER_ID=NUMVDA
MSG91_TEMPLATE_ID=REPLACE_ME
USE_MOCK_SMS=false

# ── Twilio (international) ─────────────────────────────────────────────
TWILIO_ACCOUNT_SID=REPLACE_ME
TWILIO_AUTH_TOKEN=REPLACE_ME
TWILIO_PHONE_NUMBER=REPLACE_ME

# ── Razorpay ───────────────────────────────────────────────────────────
RAZORPAY_KEY_ID=REPLACE_ME
RAZORPAY_KEY_SECRET=REPLACE_ME
RAZORPAY_WEBHOOK_SECRET=REPLACE_ME
RAZORPAY_PLAN_ID_PRO_MONTHLY=REPLACE_ME
RAZORPAY_PLAN_ID_PRO_ANNUAL=REPLACE_ME

# ── Stripe ─────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=REPLACE_ME
STRIPE_PUBLISHABLE_KEY=REPLACE_ME
STRIPE_WEBHOOK_SECRET=REPLACE_ME
STRIPE_PRICE_BASIC_REPORT=REPLACE_ME
STRIPE_PRICE_PRO_MONTHLY=REPLACE_ME
STRIPE_PRICE_PRO_ANNUAL=REPLACE_ME

# ── Database ───────────────────────────────────────────────────────────
# Supabase PostgreSQL (recommended):
DATABASE_URL=postgresql://postgres:PASSWORD@db.YOURPROJECT.supabase.co:5432/postgres
# Or Hostinger MySQL:
# DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/numerastra

# ── App ────────────────────────────────────────────────────────────────
APP_URL=https://numerastra.com
INTERNAL_API_SECRET=REPLACE_ME
ALLOWED_ORIGINS=https://numerastra.com,https://www.numerastra.com
ENVTEMPLATE

  chmod 600 "$ENV_FILE"
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  warn ".env created at $ENV_FILE — FILL IN ALL REPLACE_ME VALUES BEFORE CONTINUING"
  warn "Edit with: nano $ENV_FILE"
  warn "Then rerun: sudo ./deploy.sh"
  echo ""
  echo "Press Enter after editing .env, or Ctrl+C to exit and edit now..."
  read -r
fi
info ".env file present"

section "11. Nginx configuration"
cp "$APP_DIR/api/deploy/nginx.conf" /etc/nginx/sites-available/numerastra

# Replace domain placeholder in nginx config
sed -i "s/numerastra.com/$DOMAIN/g" /etc/nginx/sites-available/numerastra

# Enable site, disable default
ln -sf /etc/nginx/sites-available/numerastra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Create public dir for static frontend
mkdir -p "$APP_DIR/public"

# Test Nginx config
nginx -t && info "Nginx config valid"
systemctl reload nginx

section "12. SSL Certificate"
# First obtain cert with webroot (HTTP must be working first)
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  # Temporarily serve webroot for ACME challenge
  mkdir -p /var/www/certbot
  certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"
  info "SSL certificate obtained"
else
  warn "SSL certificate already exists — skipping"
fi

# Reload nginx with SSL
systemctl reload nginx
info "Nginx reloaded with SSL"

section "13. PM2 — start API"
sudo -u "$APP_USER" bash -c "cd $APP_DIR/api && pm2 start ecosystem.config.js --env production"
pm2 save
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" 2>/dev/null || true
info "API started with PM2"

section "14. Frontend — deploy numerastra.html"
# If you've uploaded numerastra.html separately, copy it here:
if [ -f "$APP_DIR/api/public/numerastra.html" ]; then
  cp "$APP_DIR/api/public/numerastra.html" "$APP_DIR/public/"
  info "Frontend deployed"
else
  warn "numerastra.html not found — upload it to $APP_DIR/public/"
fi

section "15. Certbot auto-renewal"
# Add cron job for auto-renewal (Let's Encrypt certs expire every 90 days)
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
  (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
fi
info "SSL auto-renewal configured"

section "Done! Deployment summary"
echo ""
echo "  API URL:     https://$DOMAIN/api/health"
echo "  Frontend:    https://$DOMAIN"
echo "  PM2 status:  pm2 status"
echo "  API logs:    pm2 logs numerastra-api"
echo "  Nginx logs:  tail -f /var/log/nginx/numerastra-error.log"
echo ""
echo "  Next steps:"
echo "  1. Fill in .env if you haven't: nano $APP_DIR/api/.env"
echo "  2. Restart API: pm2 restart numerastra-api"
echo "  3. Upload numerastra.html to $APP_DIR/public/"
echo "  4. Register webhook URLs in Razorpay + Stripe dashboards"
echo "     Razorpay: https://$DOMAIN/api/payments/razorpay/webhook"
echo "     Stripe:   https://$DOMAIN/api/payments/stripe/webhook"
echo ""
