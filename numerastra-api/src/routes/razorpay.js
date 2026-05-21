'use strict';

const crypto  = require('crypto');
const express = require('express');
const router  = express.Router();

const { ok, err }          = require('../middleware/validate');
const { getUser, createUser, updateUser } = require('../services/store');
const { normaliseMobile }  = require('../services/sms');
const { resolvePlan }      = require('../services/plans');
const { issueTokens }      = require('../services/jwt');

// ─── SIGNATURE VERIFICATION ───────────────────────────────────────────

/**
 * Verify Razorpay webhook signature.
 * Razorpay sends X-Razorpay-Signature = HMAC-SHA256(rawBody, webhookSecret)
 */
function verifyRazorpaySignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

/**
 * Verify Razorpay payment signature (for client-side capture).
 * razorpay_order_id + "|" + razorpay_payment_id signed with key_secret
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET not set');
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

// ─── CHECKOUT SESSION CREATOR ─────────────────────────────────────────

/**
 * POST /api/payments/razorpay/create-order
 * Creates a Razorpay order for one-time payments.
 * For subscriptions, creates a Razorpay subscription instead.
 *
 * Body: { planKey, mobile, email? }
 * Returns: { orderId, amount, currency, keyId } (one-time)
 *       or { subscriptionId, keyId }           (subscription)
 */
router.post('/create-order',
  async (req, res) => {
    try {
      const { planKey, mobile, email } = req.body;
      if (!planKey || !mobile) return err(res, 'planKey and mobile are required', 400);

      const plan = resolvePlan(planKey);
      if (!plan) return err(res, `Unknown plan: ${planKey}`, 400);

      const normMobile = normaliseMobile(mobile);
      const keyId      = process.env.RAZORPAY_KEY_ID;
      const keySecret  = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) return err(res, 'Razorpay credentials not configured', 500);

      const https = require('https');
      const auth  = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

      if (plan.type === 'one_time') {
        // Create Razorpay Order
        const orderPayload = JSON.stringify({
          amount:   plan.priceINR,
          currency: 'INR',
          receipt:  `rcpt_${Date.now()}`,
          notes: {
            mobile:  normMobile,
            planKey,
            email:   email || '',
          },
        });

        const order = await razorpayRequest('POST', '/v1/orders', orderPayload, auth);

        ok(res, {
          orderId:  order.id,
          amount:   order.amount,
          currency: order.currency,
          keyId,
          plan:     { name: plan.name, description: plan.description },
        });
      } else {
        // Create Razorpay Subscription
        const { RAZORPAY_PLAN_IDS } = require('../services/plans');
        const rzpPlanId = RAZORPAY_PLAN_IDS[planKey];

        const subPayload = JSON.stringify({
          plan_id:        rzpPlanId,
          total_count:    planKey === 'pro_annual' ? 12 : 120, // billing cycles
          quantity:       1,
          notes: { mobile: normMobile, planKey, email: email || '' },
        });

        const sub = await razorpayRequest('POST', '/v1/subscriptions', subPayload, auth);

        ok(res, {
          subscriptionId: sub.id,
          keyId,
          plan: { name: plan.name, description: plan.description },
        });
      }
    } catch (e) {
      console.error('[Razorpay] create-order error:', e.message);
      err(res, 'Could not create payment session. Please try again.', 500);
    }
  }
);

/**
 * POST /api/payments/razorpay/capture
 * Client calls this after Razorpay checkout success to verify signature
 * and immediately upgrade the user's tier without waiting for webhook.
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, mobile, planKey }
 */
router.post('/capture',
  async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mobile, planKey } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !mobile || !planKey) {
        return err(res, 'Missing required fields', 400);
      }

      // Verify payment signature
      const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!valid) return err(res, 'Payment verification failed. Please contact support.', 400);

      const plan       = resolvePlan(planKey);
      if (!plan) return err(res, 'Unknown plan', 400);

      const normMobile = normaliseMobile(mobile);

      // Get or create user, then upgrade tier
      let user = await getUser(normMobile);
      if (!user) user = await createUser(normMobile);
      await updateUser(normMobile, { tier: plan.tier });

      // Issue fresh tokens with new tier
      const freshUser = await getUser(normMobile);
      const tokens    = await issueTokens(freshUser);

      console.log(`[Razorpay] Payment verified — ${normMobile} → ${plan.tier} (${planKey})`);

      ok(res, {
        success:      true,
        tier:         plan.tier,
        plan:         plan.name,
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt:    tokens.expiresAt,
      });
    } catch (e) {
      console.error('[Razorpay] capture error:', e.message);
      err(res, e.message || 'Verification failed', 400);
    }
  }
);

/**
 * POST /api/payments/razorpay/webhook
 * Receives Razorpay server-to-server events.
 * Must be raw body (not parsed JSON) for signature verification.
 * Registered in Razorpay dashboard → Webhooks.
 *
 * Events handled:
 *   payment.captured        → one-time purchase confirmed
 *   subscription.activated  → subscription started
 *   subscription.charged    → renewal succeeded
 *   subscription.halted     → payment failed after retries → downgrade
 *   subscription.cancelled  → user cancelled → downgrade at period end
 */
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[Razorpay] RAZORPAY_WEBHOOK_SECRET not set');
      return res.status(500).send('Webhook secret not configured');
    }

    // Verify signature using raw body
    if (!verifyRazorpaySignature(req.body, signature, secret)) {
      console.warn('[Razorpay] Webhook signature mismatch');
      return res.status(400).send('Invalid signature');
    }

    let event;
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).send('Invalid JSON');
    }

    console.log(`[Razorpay] Webhook: ${event.event}`);

    try {
      await handleRazorpayEvent(event);
      res.json({ received: true });
    } catch (e) {
      console.error('[Razorpay] Webhook handler error:', e.message);
      // Return 200 anyway so Razorpay doesn't retry infinitely
      res.json({ received: true, error: e.message });
    }
  }
);

// ─── EVENT HANDLERS ───────────────────────────────────────────────────

async function handleRazorpayEvent(event) {
  const { event: type, payload } = event;

  switch (type) {
    case 'payment.captured': {
      const payment = payload.payment?.entity;
      if (!payment) return;
      const { mobile, planKey } = payment.notes || {};
      if (!mobile || !planKey) return;

      const plan = resolvePlan(planKey);
      if (!plan) return;

      const normMobile = normaliseMobile(mobile);
      let user = await getUser(normMobile);
      if (!user) user = await createUser(normMobile);
      await updateUser(normMobile, { tier: plan.tier });

      console.log(`[Razorpay] payment.captured — ${normMobile} → ${plan.tier}`);
      break;
    }

    case 'subscription.activated':
    case 'subscription.charged': {
      const sub = payload.subscription?.entity;
      if (!sub) return;
      const { mobile, planKey } = sub.notes || {};
      if (!mobile || !planKey) return;

      const plan = resolvePlan(planKey);
      if (!plan) return;

      const normMobile = normaliseMobile(mobile);
      let user = await getUser(normMobile);
      if (!user) user = await createUser(normMobile);
      await updateUser(normMobile, { tier: plan.tier });

      console.log(`[Razorpay] ${type} — ${normMobile} → ${plan.tier}`);
      break;
    }

    case 'subscription.halted':
    case 'subscription.cancelled':
    case 'subscription.completed': {
      const sub = payload.subscription?.entity;
      if (!sub) return;
      const { mobile } = sub.notes || {};
      if (!mobile) return;

      const normMobile = normaliseMobile(mobile);
      await updateUser(normMobile, { tier: 'free' });

      console.log(`[Razorpay] ${type} — ${normMobile} → downgraded to free`);
      break;
    }

    default:
      console.log(`[Razorpay] Unhandled event type: ${type}`);
  }
}

// ─── RAZORPAY API HELPER ──────────────────────────────────────────────

function razorpayRequest(method, path, body, auth) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const options = {
      hostname: 'api.razorpay.com',
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, r => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.description || parsed.error.code));
          else resolve(parsed);
        } catch { reject(new Error('Razorpay parse error: ' + data)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Razorpay timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = router;
