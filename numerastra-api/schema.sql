-- ============================================================
-- Numerastra database schema
-- Paste this into Supabase → SQL Editor → Run
-- Safe to run multiple times (IF NOT EXISTS everywhere)
-- ============================================================

-- ─── USERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                 VARCHAR(30)   PRIMARY KEY,
  mobile             VARCHAR(20)   NOT NULL UNIQUE,
  email              VARCHAR(255),
  tier               VARCHAR(10)   NOT NULL DEFAULT 'free'
                       CHECK (tier IN ('free', 'basic', 'pro')),
  free_questions_used INTEGER       NOT NULL DEFAULT 0,
  stripe_customer_id VARCHAR(50),
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_mobile            ON users (mobile);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer   ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ─── OTPs ──────────────────────────────────────────────────
-- One row per mobile number; replaced on each new OTP request.
CREATE TABLE IF NOT EXISTS otps (
  mobile       VARCHAR(20)  PRIMARY KEY,
  code         CHAR(6)      NOT NULL,
  expires_at   TIMESTAMPTZ  NOT NULL,
  attempts     INTEGER      NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  send_count   INTEGER      NOT NULL DEFAULT 1
);

-- ─── SESSIONS (JWT JTI allowlist) ──────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  jti        VARCHAR(36)  PRIMARY KEY,
  user_id    VARCHAR(30)  NOT NULL,
  mobile     VARCHAR(20)  NOT NULL,
  issued_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ  NOT NULL,
  revoked    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sessions_mobile     ON sessions (mobile);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- ─── DEVICE FLAGS (multi-account fraud detection) ──────────
CREATE TABLE IF NOT EXISTS device_flags (
  fingerprint_hash VARCHAR(64)  PRIMARY KEY,
  first_seen       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  registrations    JSONB        NOT NULL DEFAULT '[]'
);

-- ─── VERIFY ────────────────────────────────────────────────
-- After running, you should see 4 rows in the result below:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'otps', 'sessions', 'device_flags')
ORDER BY table_name;
