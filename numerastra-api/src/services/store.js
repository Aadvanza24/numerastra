'use strict';

/**
 * POSTGRES STORE (replaces in-memory Maps)
 * All functions are async — callers must await them.
 * Tables: users, otps, sessions, device_flags  →  see schema.sql
 */

const pool = require('./db');

const OTP_TTL_MS             = 10 * 60 * 1000;
const OTP_MAX_TRIES          = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_SENDS_PER_HOUR = 5;

function generateId() {
  return `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function mapUser(row) {
  if (!row) return null;
  return {
    id:                row.id,
    mobile:            row.mobile,
    email:             row.email,
    tier:              row.tier,
    freeQuestionsUsed: row.free_questions_used,
    stripeCustomerId:  row.stripe_customer_id || null,
    createdAt:         row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt:         row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

const PATCH_MAP = {
  email:             'email',
  tier:              'tier',
  freeQuestionsUsed: 'free_questions_used',
  stripeCustomerId:  'stripe_customer_id',
};

// ─── USERS ─────────────────────────────────────────────────────────────

async function createUser(mobile, email = null) {
  const id = generateId();
  const { rows } = await pool.query(
    `INSERT INTO users (id, mobile, email, tier, free_questions_used, created_at, updated_at)
     VALUES ($1, $2, $3, 'free', 0, NOW(), NOW())
     ON CONFLICT (mobile) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [id, mobile, email]
  );
  return mapUser(rows[0]);
}

async function getUser(mobile) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE mobile = $1`, [mobile]);
  return mapUser(rows[0] || null);
}

async function getUserByStripeCustomerId(customerId) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE stripe_customer_id = $1`, [customerId]);
  return mapUser(rows[0] || null);
}

async function updateUser(mobile, patch) {
  const sets = []; const values = []; let idx = 1;
  for (const [key, val] of Object.entries(patch)) {
    const col = PATCH_MAP[key];
    if (col) { sets.push(`${col} = $${idx++}`); values.push(val); }
  }
  if (!sets.length) return null;
  sets.push(`updated_at = NOW()`);
  values.push(mobile);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE mobile = $${idx} RETURNING *`, values
  );
  return mapUser(rows[0] || null);
}

async function incrementFreeQuestions(mobile) {
  const { rows } = await pool.query(
    `UPDATE users SET free_questions_used = free_questions_used + 1, updated_at = NOW()
     WHERE mobile = $1 RETURNING free_questions_used`,
    [mobile]
  );
  return rows.length ? rows[0].free_questions_used : null;
}

// ─── OTPs ──────────────────────────────────────────────────────────────

async function createOTP(mobile) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT *, EXTRACT(EPOCH FROM (NOW() - last_sent_at)) * 1000 AS ms_since_sent
       FROM otps WHERE mobile = $1 FOR UPDATE`,
      [mobile]
    );
    const existing = rows[0];
    if (existing) {
      const msSinceSent = Math.floor(Number(existing.ms_since_sent));
      if (msSinceSent < OTP_RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - msSinceSent) / 1000);
        await client.query('ROLLBACK');
        return { ok: false, error: `Please wait ${waitSec}s before requesting a new OTP.` };
      }
      const hourAgo   = new Date(Date.now() - 60 * 60 * 1000);
      const sendCount = new Date(existing.last_sent_at) > hourAgo ? existing.send_count : 0;
      if (sendCount >= OTP_MAX_SENDS_PER_HOUR) {
        await client.query('ROLLBACK');
        return { ok: false, error: 'Too many OTP requests. Please try again in 1 hour.' };
      }
    }
    const code      = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const sendCount = existing ? (existing.send_count + 1) : 1;
    await client.query(
      `INSERT INTO otps (mobile, code, expires_at, attempts, last_sent_at, send_count)
       VALUES ($1, $2, $3, 0, NOW(), $4)
       ON CONFLICT (mobile) DO UPDATE SET
         code = EXCLUDED.code, expires_at = EXCLUDED.expires_at,
         attempts = 0, last_sent_at = NOW(), send_count = EXCLUDED.send_count`,
      [mobile, code, expiresAt, sendCount]
    );
    await client.query('COMMIT');
    return { ok: true, code, expiresAt: expiresAt.getTime() };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

async function verifyOTP(mobile, inputCode) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT * FROM otps WHERE mobile = $1 FOR UPDATE`, [mobile]);
    const record = rows[0];
    if (!record) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'No OTP found. Please request a new one.' };
    }
    if (new Date() > new Date(record.expires_at)) {
      await client.query('DELETE FROM otps WHERE mobile = $1', [mobile]);
      await client.query('COMMIT');
      return { ok: false, error: 'OTP expired. Please request a new one.' };
    }
    const newAttempts = record.attempts + 1;
    if (newAttempts > OTP_MAX_TRIES) {
      await client.query('DELETE FROM otps WHERE mobile = $1', [mobile]);
      await client.query('COMMIT');
      return { ok: false, error: 'Too many incorrect attempts. Please request a new OTP.' };
    }
    if (record.code !== String(inputCode)) {
      await client.query(`UPDATE otps SET attempts = $1 WHERE mobile = $2`, [newAttempts, mobile]);
      await client.query('COMMIT');
      const remaining = OTP_MAX_TRIES - newAttempts;
      return { ok: false, error: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
    }
    await client.query('DELETE FROM otps WHERE mobile = $1', [mobile]);
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

// ─── SESSIONS ──────────────────────────────────────────────────────────

async function registerSession(jti, userId, mobile, expiresAt) {
  await pool.query(
    `INSERT INTO sessions (jti, user_id, mobile, issued_at, expires_at, revoked)
     VALUES ($1, $2, $3, NOW(), $4, FALSE) ON CONFLICT (jti) DO NOTHING`,
    [jti, userId, mobile, expiresAt]
  );
}

async function isSessionValid(jti) {
  const { rows } = await pool.query(
    `SELECT 1 FROM sessions WHERE jti = $1 AND revoked = FALSE AND expires_at > NOW()`,
    [jti]
  );
  return rows.length > 0;
}

async function revokeSession(jti) {
  await pool.query(`UPDATE sessions SET revoked = TRUE WHERE jti = $1`, [jti]);
}

async function revokeAllUserSessions(mobile) {
  await pool.query(`UPDATE sessions SET revoked = TRUE WHERE mobile = $1`, [mobile]);
}

// ─── DEVICE FLAGS ──────────────────────────────────────────────────────

async function recordDevice(fingerprintHash, mobile) {
  const client = await pool.connect();
  try {
    const now = Date.now();
    const { rows } = await client.query(
      `SELECT registrations FROM device_flags WHERE fingerprint_hash = $1`, [fingerprintHash]
    );
    const registrations = rows.length ? rows[0].registrations : [];
    registrations.push({ mobile, ts: now });
    await client.query(
      `INSERT INTO device_flags (fingerprint_hash, first_seen, registrations)
       VALUES ($1, NOW(), $2)
       ON CONFLICT (fingerprint_hash) DO UPDATE SET registrations = EXCLUDED.registrations`,
      [fingerprintHash, JSON.stringify(registrations)]
    );
    const weekAgo       = now - 7 * 24 * 60 * 60 * 1000;
    const recentMobiles = new Set(registrations.filter(r => r.ts > weekAgo).map(r => r.mobile));
    return { flagged: recentMobiles.size >= 3, uniqueMobiles: recentMobiles.size };
  } finally { client.release(); }
}

// ─── CLEANUP ───────────────────────────────────────────────────────────
async function purgeExpired() {
  try {
    const [a, b] = await Promise.all([
      pool.query(`DELETE FROM otps WHERE expires_at < NOW()`),
      pool.query(`DELETE FROM sessions WHERE expires_at < NOW()`),
    ]);
    if (a.rowCount || b.rowCount)
      console.log(`[Store] Purged ${a.rowCount} OTPs, ${b.rowCount} sessions`);
  } catch (e) { console.error('[Store] Purge error:', e.message); }
}
setInterval(purgeExpired, 15 * 60 * 1000);

module.exports = {
  createUser, getUser, updateUser, incrementFreeQuestions, getUserByStripeCustomerId,
  createOTP, verifyOTP, generateOTP,
  registerSession, isSessionValid, revokeSession, revokeAllUserSessions,
  recordDevice,
  OTP_TTL_MS, OTP_MAX_TRIES, OTP_MAX_SENDS_PER_HOUR,
};
