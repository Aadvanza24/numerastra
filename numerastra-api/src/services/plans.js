'use strict';

/**
 * PAYMENT PLANS
 * Single source of truth for plan definitions.
 * Referenced by both Razorpay and Stripe webhook handlers.
 */

const PLANS = {
  // ─── BASIC (one-time report) ─────────────────────────────────────
  basic_report: {
    tier: 'basic',
    name: 'Basic Report',
    priceINR: 24900,       // ₹249 in paise
    priceUSD: 399,         // $3.99 in cents
    type: 'one_time',
    aiQuestions: 10,
    reportTypes: ['full', 'name', 'compatibility', 'auspicious'],
    validityDays: 180,
    description: 'Full numerology report — all 4 systems, 10 AI questions, PDF download',
  },

  // ─── PRO (monthly subscription) ──────────────────────────────────
  pro_monthly: {
    tier: 'pro',
    name: 'Pro Monthly',
    priceINR: 44900,       // ₹449/month in paise
    priceUSD: 699,         // $6.99/month in cents
    type: 'subscription',
    aiQuestions: -1,       // unlimited
    reportTypes: ['all'],
    validityDays: 30,
    description: 'Unlimited AI guidance, all reports, 10 profiles, yearly forecast',
  },

  // ─── PRO (annual — 2 months free) ────────────────────────────────
  pro_annual: {
    tier: 'pro',
    name: 'Pro Annual',
    priceINR: 449900,      // ₹4499/year in paise  (saves ₹889)
    priceUSD: 6999,        // $69.99/year in cents  (saves ~$14)
    type: 'subscription',
    aiQuestions: -1,
    reportTypes: ['all'],
    validityDays: 365,
    description: 'Pro plan billed annually — 2 months free',
  },
};

// Razorpay plan IDs (set these after creating plans in Razorpay dashboard)
const RAZORPAY_PLAN_IDS = {
  pro_monthly: process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY || 'plan_pro_monthly',
  pro_annual:  process.env.RAZORPAY_PLAN_ID_PRO_ANNUAL  || 'plan_pro_annual',
};

// Stripe price IDs (set these after creating products in Stripe dashboard)
const STRIPE_PRICE_IDS = {
  basic_report: process.env.STRIPE_PRICE_BASIC_REPORT   || 'price_basic_report',
  pro_monthly:  process.env.STRIPE_PRICE_PRO_MONTHLY    || 'price_pro_monthly',
  pro_annual:   process.env.STRIPE_PRICE_PRO_ANNUAL     || 'price_pro_annual',
};

/**
 * Resolve a plan from a Razorpay or Stripe product/plan identifier.
 * The plan_id is stored in payment metadata at checkout creation time.
 */
function resolvePlan(planKey) {
  return PLANS[planKey] || null;
}

module.exports = { PLANS, RAZORPAY_PLAN_IDS, STRIPE_PRICE_IDS, resolvePlan };
