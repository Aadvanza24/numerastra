// PM2 Ecosystem Config
// Usage:
//   pm2 start ecosystem.config.js             (production)
//   pm2 start ecosystem.config.js --env dev   (development)
//   pm2 save && pm2 startup                   (auto-start on reboot)

module.exports = {
  apps: [
    {
      // ── App identity ──────────────────────────────────────────────
      name:        'numerastra-api',
      script:      'server.js',
      cwd:         '/var/www/numerastra/api',

      // ── Instances ─────────────────────────────────────────────────
      // 'max' uses all CPU cores. Start with 2 on KVM 1, 'max' on KVM 2+
      instances:   2,
      exec_mode:   'cluster',      // load-balanced across instances

      // ── Memory / restart policy ───────────────────────────────────
      max_memory_restart: '400M',  // restart if process exceeds 400MB
      restart_delay:      3000,    // wait 3s before restarting on crash
      max_restarts:       10,      // give up after 10 rapid crashes
      min_uptime:         '5s',    // must run 5s to count as stable

      // ── Logging ───────────────────────────────────────────────────
      log_date_format:    'YYYY-MM-DD HH:mm:ss',
      error_file:         '/var/log/numerastra/api-error.log',
      out_file:           '/var/log/numerastra/api-out.log',
      merge_logs:         true,    // combine cluster instance logs

      // ── Environment — production ──────────────────────────────────
      env_production: {
        NODE_ENV:  'production',
        PORT:      3000,

        // ── JWT ────────────────────────────────────────────────────
        // Generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
        JWT_SECRET: 'REPLACE_WITH_64_CHAR_HEX_SECRET',

        // ── Claude AI ─────────────────────────────────────────────
        ANTHROPIC_API_KEY: 'REPLACE_WITH_ANTHROPIC_KEY',

        // ── SMS — MSG91 (India) ───────────────────────────────────
        MSG91_API_KEY:     'REPLACE_WITH_MSG91_KEY',
        MSG91_SENDER_ID:   'NUMVDA',
        MSG91_TEMPLATE_ID: 'REPLACE_WITH_TEMPLATE_ID',
        USE_MOCK_SMS:      'false',

        // ── SMS — Twilio (international fallback) ─────────────────
        TWILIO_ACCOUNT_SID:   'REPLACE_WITH_TWILIO_SID',
        TWILIO_AUTH_TOKEN:    'REPLACE_WITH_TWILIO_TOKEN',
        TWILIO_PHONE_NUMBER:  'REPLACE_WITH_TWILIO_NUMBER',

        // ── Razorpay ──────────────────────────────────────────────
        RAZORPAY_KEY_ID:                'REPLACE_WITH_RZP_KEY_ID',
        RAZORPAY_KEY_SECRET:            'REPLACE_WITH_RZP_KEY_SECRET',
        RAZORPAY_WEBHOOK_SECRET:        'REPLACE_WITH_RZP_WEBHOOK_SECRET',
        RAZORPAY_PLAN_ID_PRO_MONTHLY:   'REPLACE_WITH_PLAN_ID',
        RAZORPAY_PLAN_ID_PRO_ANNUAL:    'REPLACE_WITH_PLAN_ID',

        // ── Stripe ────────────────────────────────────────────────
        STRIPE_SECRET_KEY:            'REPLACE_WITH_STRIPE_SECRET',
        STRIPE_PUBLISHABLE_KEY:       'REPLACE_WITH_STRIPE_PUB',
        STRIPE_WEBHOOK_SECRET:        'REPLACE_WITH_STRIPE_WEBHOOK',
        STRIPE_PRICE_BASIC_REPORT:    'REPLACE_WITH_PRICE_ID',
        STRIPE_PRICE_PRO_MONTHLY:     'REPLACE_WITH_PRICE_ID',
        STRIPE_PRICE_PRO_ANNUAL:      'REPLACE_WITH_PRICE_ID',

        // ── Database (Supabase or MySQL) ───────────────────────────
        // For Supabase PostgreSQL:
        DATABASE_URL: 'postgresql://USER:PASSWORD@db.YOURPROJECT.supabase.co:5432/postgres',
        // For Hostinger MySQL (if using MySQL instead):
        // DATABASE_URL: 'mysql://USER:PASSWORD@localhost:3306/numerastra',

        // ── App config ────────────────────────────────────────────
        APP_URL:              'https://numerastra.com',
        INTERNAL_API_SECRET:  'REPLACE_WITH_INTERNAL_SECRET',
        ALLOWED_ORIGINS:      'https://numerastra.com,https://www.numerastra.com',
        RATE_LIMIT_WINDOW_MS: '900000',
      },

      // ── Environment — development ─────────────────────────────────
      env_dev: {
        NODE_ENV:     'development',
        PORT:         3000,
        USE_MOCK_SMS: 'true',
        JWT_SECRET:   'dev-secret-not-for-production-use',
        ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173',
      },
    },
  ],
};
