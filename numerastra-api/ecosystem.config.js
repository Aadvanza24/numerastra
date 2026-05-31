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
      cwd:         './',
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
// ── Environment — production ──────────────────────────────────
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // ── Environment — development ─────────────────────────────────
      env_dev: {
        NODE_ENV:     'development',
        PORT:         3000,
        USE_MOCK_SMS: 'true',
        JWT_SECRET:   'dev-secret-not-for-production-use',
        ALLOWED_ORIGINS: 'http://localhost:8080,http://localhost:5500',
      },
    }
  ],
};
