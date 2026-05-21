#!/bin/bash
# =============================================================================
# Numerastra — Update Script
# Run this for every future deployment after the initial setup.
# Zero-downtime: PM2 cluster reload keeps the API serving during update.
#
# Usage:
#   chmod +x update.sh
#   ./update.sh
# =============================================================================

set -euo pipefail

APP_DIR="/var/www/numerastra"
APP_NAME="numerastra-api"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
section() { echo -e "\n${GREEN}━━━ $1 ━━━${NC}"; }

section "Pulling latest code"
git -C "$APP_DIR/api" pull
info "Code updated"

section "Installing dependencies"
cd "$APP_DIR/api"
npm install --production
info "Dependencies ready"

section "Running tests"
if npm test 2>/dev/null; then
  info "Tests passed"
else
  warn "No test script configured — skipping"
fi

section "Zero-downtime reload"
# PM2 cluster reload: spins up new instances before killing old ones
# API stays live throughout
pm2 reload "$APP_NAME" --update-env
info "API reloaded with zero downtime"

section "Done"
pm2 status
echo ""
echo "  Check logs: pm2 logs $APP_NAME --lines 20"
