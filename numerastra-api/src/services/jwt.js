'use strict';

const jwt  = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { registerSession, isSessionValid, revokeSession } = require('./store');

const SECRET      = process.env.JWT_SECRET || 'change-me-in-production-min-32-chars!!';
const EXPIRES_IN  = '30d';   // access token lifetime
const REFRESH_IN  = '90d';   // refresh token lifetime

if (SECRET === 'change-me-in-production-min-32-chars!!') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production. Set it in your environment variables.');
  }
  console.warn('[JWT] WARNING: using default dev secret. Set JWT_SECRET in production.');
}

/**
 * Issue a signed access token + refresh token pair for a user.
 */
async function issueTokens(user) {
  const jti         = uuidv4();
  const refreshJti  = uuidv4();
  const now         = Math.floor(Date.now() / 1000);
  const exp         = now + 30 * 24 * 60 * 60;        // 30 days
  const refreshExp  = now + 90 * 24 * 60 * 60;        // 90 days

  const payload = {
    sub:    user.id,
    mobile: user.mobile,
    tier:   user.tier,
    jti,
  };

  const accessToken = jwt.sign(payload, SECRET, {
    expiresIn: EXPIRES_IN,
    issuer: 'numerastra',
    audience: 'numerastra-client',
  });

  const refreshToken = jwt.sign(
    { sub: user.id, mobile: user.mobile, jti: refreshJti, type: 'refresh' },
    SECRET,
    { expiresIn: REFRESH_IN, issuer: 'numerastra', audience: 'numerastra-client' }
  );

  // Register in allowlist
  const expiresAt = new Date(exp * 1000).toISOString();
  await registerSession(jti, user.id, user.mobile, expiresAt);

  return { accessToken, refreshToken, expiresAt, jti };
}

/**
 * Verify an access token. Returns decoded payload or throws.
 */
async function verifyToken(token) {
  const decoded = jwt.verify(token, SECRET, {
    issuer:   'numerastra',
    audience: 'numerastra-client',
  });

  // Check JTI allowlist (guards against logout-then-reuse)
  if (!await isSessionValid(decoded.jti)) {
    throw new Error('Session has been revoked or expired. Please log in again.');
  }

  return decoded;
}

/**
 * Verify a refresh token (type must be 'refresh').
 */
function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, SECRET, {
    issuer:   'numerastra',
    audience: 'numerastra-client',
  });
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type.');
  }
  return decoded;
}

/**
 * Logout — revoke the JTI so the token can't be reused.
 */
async function revokeToken(jti) {
  await revokeSession(jti);
}

module.exports = { issueTokens, verifyToken, verifyRefreshToken, revokeToken };
