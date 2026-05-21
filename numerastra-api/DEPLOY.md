# Numerastra — Deployment Guide

Two paths covered here. Start with **Option A** (Hostinger managed) — it's faster to market. Migrate to **Option B** (Hostinger VPS) when you need it.

---

## Option A — Hostinger Business / Cloud Startup (Managed)

**Best for:** Getting live today. No server management. Auto-deploys from GitHub.  
**Cost:** ~₹350/mo (Business) or ~₹500/mo (Cloud Startup)  
**Time to live:** ~45 minutes

### Step 1 — Buy the right plan

Go to hostinger.com → Web Hosting → **Business** plan (minimum for Node.js).  
Cloud Startup is better if you expect traffic from day one — more CPU allocated.

> **Business plan** = 5 Node.js apps, MySQL included, free domain 1 year  
> **Cloud Startup** = 10 Node.js apps, more CPU, still flat pricing

### Step 2 — Push your API to GitHub

```bash
cd /path/to/numerology-api
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOURUSERNAME/numerastra-api.git
git push -u origin main
```

Make sure `.env` is in `.gitignore` — never commit secrets.

```bash
# .gitignore
.env
node_modules/
```

### Step 3 — Deploy from hPanel

1. Log in to hPanel → **Web Apps** → **Create application**
2. Select **Node.js** as the platform
3. Connect GitHub → Authorize → Select `numerastra-api` repo
4. Set:
   - **Branch:** `main`
   - **Root directory:** `/` (leave blank)
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
   - **Node.js version:** `22.x`
5. Click **Deploy** — Hostinger builds and starts the app

### Step 4 — Set environment variables

In hPanel → your app → **Environment variables** → Add each one:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | *(generate below)* |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `MSG91_API_KEY` | Your MSG91 key |
| `MSG91_SENDER_ID` | `NUMVDA` |
| `MSG91_TEMPLATE_ID` | From MSG91 dashboard |
| `USE_MOCK_SMS` | `false` |
| `RAZORPAY_KEY_ID` | From Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Set in Razorpay → Webhooks |
| `STRIPE_SECRET_KEY` | From Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | From Stripe → Webhooks |
| `DATABASE_URL` | Supabase connection string (see Step 5) |
| `APP_URL` | `https://numerastra.com` |
| `INTERNAL_API_SECRET` | *(generate below)* |
| `ALLOWED_ORIGINS` | `https://numerastra.com,https://www.numerastra.com` |

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Run twice — once for JWT_SECRET, once for INTERNAL_API_SECRET
```

### Step 5 — Database (Supabase free tier)

Hostinger Business includes MySQL. For PostgreSQL (what our store.js is designed for):

1. Go to **supabase.com** → New project (free)
2. Copy the **Connection string** from Settings → Database → URI
3. Paste as `DATABASE_URL` in hPanel env vars

> The in-memory store in store.js works for dev/testing.  
> For production, swap it for the PostgreSQL adapter (see `docs/postgres-migration.md` — coming soon).  
> Until then the app runs fine in memory — data resets on restart. Fine for launch validation.

### Step 6 — Deploy the frontend

Upload `numerastra.html` to your Hostinger file manager:

**Option 1 — Serve from Node.js (recommended):**

Add to the top of your `server.js` routes (before the 404 handler):
```js
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'numerastra.html')));
```

Put `numerastra.html` in a `/public` folder in your repo.

**Option 2 — Serve from Hostinger file manager:**  
Upload `numerastra.html` to `public_html/` via hPanel → File Manager.

### Step 7 — Connect your domain

1. hPanel → **Domains** → Point your domain to the Node.js app
2. SSL is auto-provisioned — takes ~5 minutes
3. Test: `https://numerastra.com/api/health`

### Step 8 — Register webhooks

After your domain is live with SSL:

**Razorpay:**  
Dashboard → Settings → Webhooks → Add webhook  
URL: `https://numerastra.com/api/payments/razorpay/webhook`  
Events: `payment.captured`, `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`

**Stripe:**  
Dashboard → Developers → Webhooks → Add endpoint  
URL: `https://numerastra.com/api/payments/stripe/webhook`  
Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

Copy the webhook signing secret from each dashboard and add to hPanel env vars.

### Step 9 — Verify everything works

```bash
# Health check
curl https://numerastra.com/api/health

# Test OTP (dev mode — check server logs for the code)
curl -X POST https://numerastra.com/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"mobile": "9876543210"}'

# Test calculation
curl -X POST https://numerastra.com/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"name": "Priya Sharma", "dob": "1992-03-15"}'
```

---

## Option B — Hostinger KVM VPS (Full Control)

**Best for:** 500+ daily users, native PostgreSQL, background workers, full control.  
**Cost:** ~₹550/mo (KVM 1) or ~₹900/mo (KVM 2)  
**Time to live:** ~2 hours  
**Recommended:** KVM 2 (2 vCPU, 8GB RAM) — worth the extra ₹350/mo

### Step 1 — Buy KVM VPS

hostinger.com → VPS → **KVM 2**  
- Operating system: **Ubuntu 24.04 LTS**
- Data center: **Singapore** (lowest India latency)
- Root password: save this securely

### Step 2 — SSH into your server

```bash
ssh root@YOUR_VPS_IP
```

### Step 3 — Run the automated deploy script

```bash
# Upload the deploy script to your server
scp deploy/deploy.sh root@YOUR_VPS_IP:/root/

# SSH in and run it
ssh root@YOUR_VPS_IP
chmod +x deploy.sh
./deploy.sh
```

The script handles everything: Node.js, PM2, Nginx, SSL, firewall, app user, directory structure.

### Step 4 — Fill in your .env

```bash
nano /var/www/numerastra/api/.env
# Replace every REPLACE_ME value
# Save: Ctrl+X → Y → Enter
```

### Step 5 — Restart the API

```bash
pm2 restart numerastra-api
pm2 logs numerastra-api   # verify it started cleanly
```

### Step 6 — Upload frontend

```bash
# From your local machine:
scp numerastra.html root@YOUR_VPS_IP:/var/www/numerastra/public/
```

### Step 7 — Register webhooks

Same as Option A Step 8 — register webhook URLs in Razorpay and Stripe dashboards.

---

## Future deployments (both options)

Every time you push a code change:

**Option A (Hostinger managed):** Push to GitHub → auto-redeploys (configured in hPanel).

**Option B (VPS):**
```bash
ssh root@YOUR_VPS_IP
cd /var/www/numerastra
./deploy/update.sh   # zero-downtime reload
```

---

## Monitoring & operations

### Check API status
```bash
pm2 status                          # process overview
pm2 logs numerastra-api --lines 50  # last 50 log lines
pm2 monit                           # live CPU/memory dashboard
```

### Nginx logs
```bash
tail -f /var/log/nginx/numerastra-error.log
tail -f /var/log/nginx/numerastra-access.log
```

### Common issues

| Symptom | Fix |
|---|---|
| API returns 502 Bad Gateway | Node.js not running — `pm2 restart numerastra-api` |
| OTP not sending | Check `MSG91_API_KEY` in .env — set `USE_MOCK_SMS=true` to test locally |
| Webhook signature fails | Ensure raw body reaches Node.js — check `proxy_request_buffering off` in Nginx |
| CORS error on frontend | Add your domain to `ALLOWED_ORIGINS` in .env, restart API |
| SSL not working | Check `certbot renew --dry-run` — if domain DNS not pointed yet, it fails |
| 429 Too Many Requests | Hit Nginx rate limit — normal protection. Adjust zones in nginx.conf if needed |

### SSL renewal (VPS only — managed handles this automatically)
```bash
certbot renew --dry-run    # test renewal
certbot renew              # manual renew if needed
```

Auto-renewal is set up by deploy.sh via cron — runs daily at 3am.

---

## Environment variable quick reference

```bash
# Generate a secure random secret (run for JWT_SECRET and INTERNAL_API_SECRET)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Test your MSG91 setup (check server logs for OTP code)
USE_MOCK_SMS=false node -e "
  require('dotenv').config();
  const {sendOTP} = require('./src/services/sms');
  sendOTP('+919876543210', '123456').then(console.log).catch(console.error);
"

# Test Supabase connection
node -e "
  require('dotenv').config();
  const {Pool} = require('pg');
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  pool.query('SELECT NOW()').then(r => {console.log('DB OK:', r.rows[0]); process.exit(0);});
"
```

---

## Cost summary

| Component | Option A (Managed) | Option B (KVM VPS) |
|---|---|---|
| Hosting | ₹350–500/mo | ₹550–900/mo |
| Domain | Free 1st year | ~₹800/year |
| SSL | Free (included) | Free (Let's Encrypt) |
| Database | Supabase free (500MB) | PostgreSQL native (free) |
| MSG91 OTP | ~₹0.15/OTP | ~₹0.15/OTP |
| **Total at launch** | **~₹350–500/mo** | **~₹550–900/mo** |

---

## Hostinger-specific notes

**Managed hosting (Option A) — what's handled for you:**
- Process restarts on crash (no PM2 needed)
- SSL certificates (auto-managed)
- Server security updates
- Nginx reverse proxy (auto-configured)
- Zero-downtime deploys via GitHub

**VPS (Option B) — what you manage:**
- OS security updates (`apt upgrade`)
- PM2 process management
- Nginx configuration
- SSL renewal (automated via cron in deploy.sh)
- PostgreSQL backups (set up `pg_dump` cron)

---

*Last updated: April 2026 — tested against Hostinger Business and KVM 2 plans*
