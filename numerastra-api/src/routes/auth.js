'use strict';

const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { validate, ok, err }                                  = require('../middleware/validate');
const { requireAuth }                                        = require('../middleware/auth');
const { normaliseMobile, validateMobile, sendOTP }          = require('../services/sms');
const { createOTP, verifyOTP, getUser, createUser,
        updateUser, recordDevice, revokeAllUserSessions,
        incrementFreeQuestions }                             = require('../services/store');
const { issueTokens, verifyRefreshToken, revokeToken }      = require('../services/jwt');

const router = express.Router();

// ─── AUTH-SPECIFIC RATE LIMITS ────────────────────────────────────────

// Max 5 OTP sends per 10 minutes per IP
const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  //keyGenerator: req => req.ip,
  message: { success: false, error: 'Too many OTP requests from this device. Try again in 10 minutes.' },
});

// Max 10 verify attempts per 10 minutes per IP
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  //keyGenerator: req => req.ip,
  message: { success: false, error: 'Too many verification attempts. Try again in 10 minutes.' },
});

// ─── VALIDATORS ───────────────────────────────────────────────────────

const vMobile = body('mobile')
  .isString().withMessage('mobile is required')
  .trim().notEmpty().withMessage('mobile is required')
  .customSanitizer(v => v.replace(/\s/g, ''))
  .custom(v => {
    validateMobile(v); // throws if invalid
    return true;
  });

const vOTP = body('otp')
  .isString().withMessage('otp is required')
  .trim()
  .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
  .isNumeric().withMessage('OTP must contain digits only');

const vEmail = body('email')
  .isEmail().withMessage('Please enter a valid email address')
  .normalizeEmail();

// ─── ROUTES ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/otp/send
 * Request an OTP for a mobile number.
 *
 * Body: { mobile: "+919038303115" }
 * Returns: { expiresAt, maskedMobile }
 */
router.post('/otp/send',
  otpSendLimiter,
  [vMobile],
  validate,
  async (req, res) => {
    try {
      const mobile = normaliseMobile(req.body.mobile);

      // Create OTP record (includes rate-limit checks)
      const result = await createOTP(mobile);
      if (!result.ok) return err(res, result.error, 429);

      // Send via SMS
      await sendOTP(mobile, result.code);

      // Mask mobile for response: +91XXXXX54321
      const masked = mobile.slice(0, 3) + 'XXXXX' + mobile.slice(-5);

      ok(res, {
        sent: true,
        maskedMobile: masked,
        expiresAt: new Date(result.expiresAt).toISOString(),
        ttlSeconds: 600,
      });
    } catch (e) {
  console.error('[OTP SEND ERROR]', e);
  err(res, e.message || 'OTP failed', 400);
    }
  }
);

/**
 * POST /api/auth/otp/verify
 * Verify OTP. Creates account if first time. Returns JWT pair.
 *
 * Body: { mobile, otp, deviceFingerprint? }
 * Returns: { accessToken, refreshToken, user, isNewUser }
 */
router.post('/otp/verify',
  otpVerifyLimiter,
  [vMobile, vOTP],
  validate,
  async (req, res) => {
    try {
      const mobile = normaliseMobile(req.body.mobile);
      const { otp, deviceFingerprint } = req.body;

      // Verify OTP
      const result = await verifyOTP(mobile, otp);
      if (!result.ok) return err(res, result.error, 400);

      // Device fingerprint check (soft — just logs, doesn't block)
      let deviceWarning = null;
      if (deviceFingerprint) {
        const flag = await recordDevice(deviceFingerprint, mobile);
        if (flag.flagged) {
          console.warn(`[Auth] Suspicious: device ${deviceFingerprint} has ${flag.uniqueMobiles} mobiles registered`);
          deviceWarning = 'Multiple accounts detected from this device.';
        }
      }

      // Get or create user
      let user = await getUser(mobile);
      const isNewUser = !user;
      if (isNewUser) {
        user = await createUser(mobile, req.body.email || null);
      }

      // Issue JWT pair
      const tokens = await issueTokens(user);

      ok(res, {
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt:    tokens.expiresAt,
        isNewUser,
        user: sanitiseUser(user),
        ...(deviceWarning && { warning: deviceWarning }),
      });
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Exchange a refresh token for a new access token pair.
 *
 * Body: { refreshToken }
 * Returns: { accessToken, refreshToken, expiresAt }
 */
router.post('/refresh',
  [body('refreshToken').isString().notEmpty().withMessage('refreshToken is required')],
  validate,
  async (req, res) => {
    try {
      const decoded = verifyRefreshToken(req.body.refreshToken);
      const user    = await getUser(decoded.mobile);
      if (!user) return err(res, 'Account not found.', 401);

      const tokens = await issueTokens(user);
      ok(res, {
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt:    tokens.expiresAt,
      });
    } catch (e) {
      err(res, 'Invalid or expired refresh token. Please log in again.', 401);
    }
  }
);

/**
 * POST /api/auth/logout
 * Revoke current session token.
 * Optionally revoke all sessions (logoutAll: true).
 *
 * Headers: Authorization: Bearer <token>
 * Body: { logoutAll? }
 */
router.post('/logout',
  requireAuth,
  async (req, res) => {
    try {
      if (req.body.logoutAll) {
        await revokeAllUserSessions(req.user.mobile);
        return ok(res, { loggedOut: true, scope: 'all' });
      }
      await revokeToken(req.user.jti);
      ok(res, { loggedOut: true, scope: 'current' });
    } catch (e) {
      err(res, e.message, 500);
    }
  }
);

/**
 * GET /api/auth/me
 * Return the authenticated user's profile.
 *
 * Headers: Authorization: Bearer <token>
 */
router.get('/me',
  requireAuth,
  async (req, res) => {
    const user = await getUser(req.user.mobile);

    if (!user) {
      return err(res, 'Account not found.', 404);
    }

    ok(res, sanitiseUser(user));
  }
);

/**
 * PATCH /api/auth/email
 * Set or update the user's email address.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { email }
 */
router.patch('/email',
  requireAuth,
  [vEmail],
  validate,
  async (req, res) => {
    const updated = await updateUser(req.user.mobile, { email: req.body.email });
    ok(res, sanitiseUser(updated));
  }
);

/**
 * PATCH /api/auth/tier
 * Internal endpoint — update tier after payment confirmation.
 * Requires X-Internal-Secret header.
 * In production, call this from your Razorpay/Stripe webhook handler.
 *
 * Body: { mobile, tier: 'basic' | 'pro' | 'free' }
 */
router.patch('/tier',
  (req, res, next) => {
    const secret = req.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return err(res, 'Forbidden.', 403);
    }
    next();
  },
  [
    body('mobile').isString().notEmpty(),
    body('tier').isIn(['free','basic','pro']).withMessage('tier must be free, basic, or pro'),
  ],
  validate,
  async (req, res) => {
    try {
      const mobile  = normaliseMobile(req.body.mobile);
      const updated = await updateUser(mobile, { tier: req.body.tier });
      if (!updated) return err(res, 'User not found.', 404);
      ok(res, sanitiseUser(updated));
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

// ─── HELPERS ──────────────────────────────────────────────────────────

function sanitiseUser(user) {
  return {
    id:                 user.id,
    mobile:             user.mobile,
    email:              user.email,
    tier:               user.tier,
    freeQuestionsUsed:  user.freeQuestionsUsed,
    freeQuestionLimit:  2,
    createdAt:          user.createdAt,
  };
}

module.exports = router;
