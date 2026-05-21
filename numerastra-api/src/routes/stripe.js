'use strict';

const express = require('express');
const stripe  = require('stripe');
const router  = express.Router();

const { ok, err }              = require('../middleware/validate');
const { getUser, createUser, updateUser, getUserByStripeCustomerId } = require('../services/store');
const { normaliseMobile }      = require('../services/sms');
const { resolvePlan, STRIPE_PRICE_IDS } = require('../services/plans');
const { issueTokens }          = require('../services/jwt');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return stripe(key);
}

// ─── CHECKOUT SESSION CREATOR ─────────────────────────────────────────

/**
 * POST /api/payments/stripe/create-checkout
 * Creates a Stripe Checkout Session (hosted payment page).
 *
 * Body: { planKey, mobile, email?, successUrl, cancelUrl }
 * Returns: { sessionId, url } — redirect user to url
 */
router.post('/create-checkout',
  async (req, res) => {
    try {
      const { planKey, mobile, email, successUrl, cancelUrl } = req.body;
      if (!planKey || !mobile) return err(res, 'planKey and mobile are required', 400);

      const plan = resolvePlan(planKey);
      if (!plan) return err(res, `Unknown plan: ${planKey}`, 400);

      const normMobile  = normaliseMobile(mobile);
      const stripeClient = getStripe();
      const priceId      = STRIPE_PRICE_IDS[planKey];
      if (!priceId) return err(res, `No Stripe price configured for ${planKey}`, 500);

      const sessionParams = {
        mode:                plan.type === 'one_time' ? 'payment' : 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl || `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  cancelUrl  || `${process.env.APP_URL}/payment/cancelled`,
        metadata:    { mobile: normMobile, planKey },
        ...(email && { customer_email: email }),
        // Allow promotion codes
        allow_promotion_codes: true,
      };

      // For subscriptions, enable portal access
      if (plan.type === 'subscription') {
        sessionParams.subscription_data = {
          metadata: { mobile: normMobile, planKey },
        };
      }

      const session = await stripeClient.checkout.sessions.create(sessionParams);

      ok(res, {
        sessionId: session.id,
        url:       session.url,
        plan:      { name: plan.name, description: plan.description },
      });
    } catch (e) {
      console.error('[Stripe] create-checkout error:', e.message);
      err(res, 'Could not create payment session. Please try again.', 500);
    }
  }
);

/**
 * POST /api/payments/stripe/capture
 * Called after Stripe Checkout redirect to verify session and upgrade user.
 * Client sends session_id from success_url query param.
 *
 * Body: { sessionId, mobile }
 */
router.post('/capture',
  async (req, res) => {
    try {
      const { sessionId, mobile } = req.body;
      if (!sessionId || !mobile) return err(res, 'sessionId and mobile required', 400);

      const stripeClient = getStripe();
      const session      = await stripeClient.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return err(res, 'Payment not yet completed', 402);
      }

      const { planKey } = session.metadata || {};
      const plan = resolvePlan(planKey);
      if (!plan) return err(res, 'Could not resolve plan from session', 400);

      const normMobile = normaliseMobile(mobile);
      let user = await getUser(normMobile);
      if (!user) user = await createUser(normMobile);
      await updateUser(normMobile, { tier: plan.tier });

      const freshUser = await getUser(normMobile);
      const tokens    = await issueTokens(freshUser);

      console.log(`[Stripe] Capture verified — ${normMobile} → ${plan.tier} (${planKey})`);

      ok(res, {
        success:      true,
        tier:         plan.tier,
        plan:         plan.name,
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt:    tokens.expiresAt,
      });
    } catch (e) {
      console.error('[Stripe] capture error:', e.message);
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /api/payments/stripe/webhook
 * Receives Stripe server-to-server events.
 * MUST use raw body — Stripe signature verification requires it.
 * Register URL in Stripe Dashboard → Webhooks.
 *
 * Events handled:
 *   checkout.session.completed         → one-time purchase OR subscription started
 *   invoice.payment_succeeded          → subscription renewed
 *   invoice.payment_failed             → renewal failed (grace period starts)
 *   customer.subscription.deleted      → cancelled → downgrade to free
 *   customer.subscription.updated      → plan changed
 */
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig    = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[Stripe] STRIPE_WEBHOOK_SECRET not set');
      return res.status(500).send('Webhook secret not configured');
    }

    let event;
    try {
      const stripeClient = getStripe();
      event = stripeClient.webhooks.constructEvent(req.body, sig, secret);
    } catch (e) {
      console.warn('[Stripe] Webhook signature error:', e.message);
      return res.status(400).send(`Webhook Error: ${e.message}`);
    }

    console.log(`[Stripe] Webhook: ${event.type}`);

    try {
      await handleStripeEvent(event);
      res.json({ received: true });
    } catch (e) {
      console.error('[Stripe] Event handler error:', e.message);
      // Return 200 so Stripe doesn't retry infinitely
      res.json({ received: true, error: e.message });
    }
  }
);

// ─── STRIPE PORTAL ────────────────────────────────────────────────────

/**
 * POST /api/payments/stripe/portal
 * Creates a Stripe Billing Portal session so users can manage their subscription.
 * Requires the user's Stripe customer ID (stored after first checkout).
 *
 * Body: { stripeCustomerId, returnUrl }
 */
router.post('/portal',
  async (req, res) => {
    try {
      const { stripeCustomerId, returnUrl } = req.body;
      if (!stripeCustomerId) return err(res, 'stripeCustomerId required', 400);

      const stripeClient = getStripe();
      const session = await stripeClient.billingPortal.sessions.create({
        customer:   stripeCustomerId,
        return_url: returnUrl || process.env.APP_URL,
      });

      ok(res, { url: session.url });
    } catch (e) {
      console.error('[Stripe] portal error:', e.message);
      err(res, 'Could not open billing portal', 500);
    }
  }
);

// ─── EVENT HANDLERS ───────────────────────────────────────────────────

async function handleStripeEvent(event) {
  const obj = event.data.object;

  switch (event.type) {

    case 'checkout.session.completed': {
      const { mobile, planKey } = obj.metadata || {};
      if (!mobile || !planKey) {
        console.warn('[Stripe] checkout.session.completed missing metadata');
        return;
      }
      const plan = resolvePlan(planKey);
      if (!plan) return;

      const normMobile = normaliseMobile(mobile);
      let user = await getUser(normMobile);
      if (!user) user = await createUser(normMobile);
      await updateUser(normMobile, {
        tier: plan.tier,
        stripeCustomerId: obj.customer || null,
      });

      console.log(`[Stripe] checkout.session.completed — ${normMobile} → ${plan.tier}`);
      break;
    }

    case 'invoice.payment_succeeded': {
      // Subscription renewed — keep tier active
      const customerId = obj.customer;
      if (!customerId) return;
      const mobile = await getMobileByStripeCustomer(customerId);
      if (!mobile) return;

      // Re-confirm tier is active (in case it was downgraded for late payment)
      const user = await getUser(mobile);
      if (user && user.tier === 'free') {
        // Restore tier from subscription metadata
        const planKey = obj.lines?.data?.[0]?.metadata?.planKey;
        const plan    = planKey ? resolvePlan(planKey) : null;
        if (plan) await updateUser(mobile, { tier: plan.tier });
      }

      console.log(`[Stripe] invoice.payment_succeeded — ${mobile}`);
      break;
    }

    case 'invoice.payment_failed': {
      // Stripe will retry — don't downgrade yet, just log
      const customerId = obj.customer;
      const mobile     = await getMobileByStripeCustomer(customerId);
      console.warn(`[Stripe] invoice.payment_failed — ${mobile || customerId}`);
      // TODO: send a "payment failed" push notification to the user
      break;
    }

    case 'customer.subscription.deleted': {
      // Subscription cancelled (user cancelled or all retries exhausted)
      const customerId = obj.customer;
      const mobile     = await getMobileByStripeCustomer(customerId);
      if (!mobile) return;

      await updateUser(mobile, { tier: 'free' });
      console.log(`[Stripe] subscription.deleted — ${mobile} → free`);
      break;
    }

    case 'customer.subscription.updated': {
      const customerId = obj.customer;
      const mobile     = await getMobileByStripeCustomer(customerId);
      if (!mobile) return;

      // Subscription status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'
      const status = obj.status;
      if (status === 'active' || status === 'trialing') {
        // Keep or restore pro
        const user = await getUser(mobile);
        if (user && user.tier !== 'pro') await updateUser(mobile, { tier: 'pro' });
      } else if (status === 'past_due' || status === 'unpaid') {
        // Grace period — keep access for now, warn user
        console.warn(`[Stripe] subscription past_due — ${mobile}`);
      } else if (status === 'canceled') {
        await updateUser(mobile, { tier: 'free' });
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event: ${event.type}`);
  }
}

// ─── HELPER ───────────────────────────────────────────────────────────

/** Look up mobile by Stripe customer ID using PostgreSQL. */
async function getMobileByStripeCustomer(customerId) {
  const { getUserByStripeCustomerId } = require('../services/store');
  const user = await getUserByStripeCustomerId(customerId);
  return user ? user.mobile : null;
}

module.exports = router;
