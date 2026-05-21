'use strict';

const { verifyToken }        = require('../services/jwt');
const { getUser }            = require('../services/store');
const { err }                = require('./validate');

const FREE_QUESTION_LIMIT = 2;

/**
 * requireAuth
 * Validates Bearer token. Attaches req.user = { id, mobile, tier, jti }.
 */
async function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Bearer ')) {
    return err(res, 'Authentication required. Please log in.', 401);
  }

  const token = header.slice(7).trim();
  try {
    const decoded = await verifyToken(token);
    // Attach live user record (tier may have changed since token was issued)
    const user = await getUser(decoded.mobile);
    if (!user) return err(res, 'Account not found.', 401);

    req.user = {
      id:     user.id,
      mobile: user.mobile,
      email:  user.email,
      tier:   user.tier,
      jti:    decoded.jti,
      freeQuestionsUsed: user.freeQuestionsUsed,
    };
    next();
  } catch (e) {
    const msg = e.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : e.message || 'Invalid token.';
    return err(res, msg, 401);
  }
}

/**
 * optionalAuth
 * Attaches req.user if a valid token is present, but doesn't block if absent.
 */
async function optionalAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Bearer ')) return next();

  const token = header.slice(7).trim();
  try {
    const decoded = await verifyToken(token);
    const user    = await getUser(decoded.mobile);
    if (user) {
      req.user = {
        id: user.id, mobile: user.mobile,
        email: user.email, tier: user.tier,
        jti: decoded.jti,
        freeQuestionsUsed: user.freeQuestionsUsed,
      };
    }
  } catch { /* ignore — optional */ }
  next();
}

/**
 * requireTier(minTier)
 * Must come after requireAuth.
 * Blocks access if user's tier is below the required level.
 *
 * Tier hierarchy: free < basic < pro
 */
const TIER_RANK = { free: 0, basic: 1, pro: 2 };

function requireTier(minTier) {
  return (req, res, next) => {
    if (!req.user) return err(res, 'Authentication required.', 401);
    const userRank = TIER_RANK[req.user.tier] ?? 0;
    const minRank  = TIER_RANK[minTier]       ?? 1;
    if (userRank < minRank) {
      return err(res, `This feature requires a ${minTier} plan. Upgrade to continue.`, 403, {
        currentTier: req.user.tier,
        requiredTier: minTier,
        upgradeUrl: '/upgrade',
      });
    }
    next();
  };
}

/**
 * freeQuestionGate
 * Must come after requireAuth.
 * Allows up to FREE_QUESTION_LIMIT AI questions on the free tier.
 * Paid tiers bypass this check entirely.
 */
function freeQuestionGate(req, res, next) {
  if (!req.user) return err(res, 'Authentication required.', 401);

  // Paid tiers bypass the gate
  if (req.user.tier !== 'free') return next();

  if (req.user.freeQuestionsUsed >= FREE_QUESTION_LIMIT) {
    return err(res, `You've used all ${FREE_QUESTION_LIMIT} free AI questions. Upgrade to continue.`, 403, {
      freeQuestionsUsed: req.user.freeQuestionsUsed,
      freeQuestionLimit: FREE_QUESTION_LIMIT,
      upgradeUrl: '/upgrade',
    });
  }

  next();
}

module.exports = { requireAuth, optionalAuth, requireTier, freeQuestionGate };
