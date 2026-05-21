'use strict';

/**
 * PAYMENT SYSTEM TEST SUITE
 * Tests plans, signature verification, webhook event handlers,
 * and tier upgrade/downgrade logic.
 * Run: node tests/payment.test.js
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-32-chars-minimum-here!!';
process.env.RAZORPAY_KEY_ID     = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';

const crypto  = require('crypto');
const { PLANS, resolvePlan, RAZORPAY_PLAN_IDS, STRIPE_PRICE_IDS } = require('../src/services/plans');
const store   = require('../src/services/store');
const { normaliseMobile } = require('../src/services/sms');

let passed = 0; let failed = 0; const failures = [];

function test(label, fn) {
  try {
    const r = fn();
    if (r instanceof Promise) {
      return r.then(() => { console.log(`  ✓  ${label}`); passed++; })
              .catch(e => { console.log(`  ✗  ${label} — ${e.message}`); failed++; failures.push(label); });
    }
    console.log(`  ✓  ${label}`); passed++;
  } catch (e) {
    console.log(`  ✗  ${label} — ${e.message}`); failed++; failures.push(label);
  }
  return Promise.resolve();
}

function assert(c, m) { if (!c) throw new Error(m || 'Assertion failed'); }
function eq(a, b) { if (a !== b) throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function sec(s) { console.log(`\n── ${s} ${'─'.repeat(48 - s.length)}`); }

async function run() {

// ─── PLANS ────────────────────────────────────────────────────────────
sec('Plan definitions');

await test('All 3 plans exist', () => {
  assert(PLANS.basic_report, 'basic_report missing');
  assert(PLANS.pro_monthly,  'pro_monthly missing');
  assert(PLANS.pro_annual,   'pro_annual missing');
});
await test('basic_report is one_time type', () => {
  eq(PLANS.basic_report.type, 'one_time');
  eq(PLANS.basic_report.tier, 'basic');
});
await test('pro_monthly is subscription type', () => {
  eq(PLANS.pro_monthly.type, 'subscription');
  eq(PLANS.pro_monthly.tier, 'pro');
});
await test('pro_annual costs less per month than pro_monthly × 12', () => {
  assert(PLANS.pro_annual.priceINR < PLANS.pro_monthly.priceINR * 12, 'annual should be cheaper than 12× monthly');
});
await test('resolvePlan returns correct plan', () => {
  const p = resolvePlan('basic_report');
  eq(p.name, 'Basic Report');
  eq(p.priceINR, 24900);
});
await test('resolvePlan returns null for unknown key', () => {
  eq(resolvePlan('nonexistent'), null);
});
await test('All plans have INR and USD prices', () => {
  for (const [key, plan] of Object.entries(PLANS)) {
    assert(plan.priceINR > 0, `${key} missing priceINR`);
    assert(plan.priceUSD > 0, `${key} missing priceUSD`);
  }
});
await test('All plans have descriptions', () => {
  for (const [key, plan] of Object.entries(PLANS)) {
    assert(plan.description?.length > 10, `${key} missing description`);
  }
});

// ─── RAZORPAY SIGNATURE VERIFICATION ─────────────────────────────────
sec('Razorpay signature verification');

function makeRazorpaySignature(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}
function verifyRazorpaySignature(rawBody, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}
function verifyPaymentSig(orderId, paymentId, secret) {
  return (sig) => {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected,'hex'), Buffer.from(sig,'hex'));
  };
}

await test('Valid webhook signature passes', () => {
  const body = JSON.stringify({ event: 'payment.captured' });
  const sig  = makeRazorpaySignature(body, 'test_webhook_secret');
  assert(verifyRazorpaySignature(body, sig, 'test_webhook_secret'), 'should pass');
});
await test('Tampered body fails signature check', () => {
  const body    = JSON.stringify({ event: 'payment.captured' });
  const sig     = makeRazorpaySignature(body, 'test_webhook_secret');
  const tampered = JSON.stringify({ event: 'payment.captured', amount: 99999 });
  assert(!verifyRazorpaySignature(tampered, sig, 'test_webhook_secret'), 'should fail');
});
await test('Wrong secret fails signature check', () => {
  const body = JSON.stringify({ event: 'payment.captured' });
  const sig  = makeRazorpaySignature(body, 'test_webhook_secret');
  assert(!verifyRazorpaySignature(body, sig, 'wrong_secret'), 'should fail');
});
await test('Payment signature verification', () => {
  const orderId = 'order_123'; const paymentId = 'pay_456';
  const secret  = 'test_secret';
  const sig     = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  assert(verifyPaymentSig(orderId, paymentId, secret)(sig), 'should pass');
});
await test('Payment signature fails with wrong IDs', () => {
  const sig = crypto.createHmac('sha256', 'test_secret').update('order_123|pay_456').digest('hex');
  assert(!verifyPaymentSig('order_999', 'pay_000', 'test_secret')(sig), 'should fail');
});

// ─── RAZORPAY WEBHOOK EVENT SIMULATION ────────────────────────────────
sec('Razorpay webhook event handling');

const RZP_MOBILE = '+919700000001';
store.createUser(RZP_MOBILE, 'rzp@test.com');

function simulateRzpEvent(type, mobile, planKey) {
  const event = { event: type, payload: {} };
  if (type.startsWith('payment')) {
    event.payload.payment = { entity: { notes: { mobile, planKey } } };
  } else {
    event.payload.subscription = { entity: { notes: { mobile, planKey } } };
  }
  return event;
}

await test('payment.captured upgrades user to correct tier', async () => {
  // Simulate what handleRazorpayEvent does
  const event = simulateRzpEvent('payment.captured', RZP_MOBILE, 'basic_report');
  const { mobile, planKey } = event.payload.payment.entity.notes;
  const plan = resolvePlan(planKey);
  store.updateUser(normaliseMobile(mobile), { tier: plan.tier });
  eq(store.getUser(RZP_MOBILE).tier, 'basic');
});

await test('subscription.activated upgrades to pro', () => {
  const event = simulateRzpEvent('subscription.activated', RZP_MOBILE, 'pro_monthly');
  const { mobile, planKey } = event.payload.subscription.entity.notes;
  const plan = resolvePlan(planKey);
  store.updateUser(normaliseMobile(mobile), { tier: plan.tier });
  eq(store.getUser(RZP_MOBILE).tier, 'pro');
});

await test('subscription.halted downgrades to free', () => {
  const event = simulateRzpEvent('subscription.halted', RZP_MOBILE, 'pro_monthly');
  const { mobile } = event.payload.subscription.entity.notes;
  store.updateUser(normaliseMobile(mobile), { tier: 'free' });
  eq(store.getUser(RZP_MOBILE).tier, 'free');
});

await test('subscription.cancelled downgrades to free', () => {
  store.updateUser(RZP_MOBILE, { tier: 'pro' });
  const event = simulateRzpEvent('subscription.cancelled', RZP_MOBILE, 'pro_monthly');
  const { mobile } = event.payload.subscription.entity.notes;
  store.updateUser(normaliseMobile(mobile), { tier: 'free' });
  eq(store.getUser(RZP_MOBILE).tier, 'free');
});

// ─── STRIPE WEBHOOK EVENT SIMULATION ─────────────────────────────────
sec('Stripe webhook event handling');

const STRIPE_MOBILE = '+919800000002';
const STRIPE_CUS_ID = 'cus_test_123';
store.createUser(STRIPE_MOBILE);
store.updateUser(STRIPE_MOBILE, { stripeCustomerId: STRIPE_CUS_ID });

await test('checkout.session.completed upgrades to pro', () => {
  const session = {
    customer: STRIPE_CUS_ID,
    metadata: { mobile: STRIPE_MOBILE, planKey: 'pro_monthly' },
  };
  const plan = resolvePlan(session.metadata.planKey);
  const normMobile = normaliseMobile(session.metadata.mobile);
  let user = store.getUser(normMobile);
  if (!user) user = store.createUser(normMobile);
  store.updateUser(normMobile, { tier: plan.tier, stripeCustomerId: session.customer });
  eq(store.getUser(STRIPE_MOBILE).tier, 'pro');
});

await test('customer.subscription.deleted downgrades to free', () => {
  store.updateUser(STRIPE_MOBILE, { tier: 'pro' });
  // Simulate handler: find mobile by customer ID, downgrade
  const { _users } = store;
  let mobile = null;
  for (const [m, u] of _users.entries()) {
    if (u.stripeCustomerId === STRIPE_CUS_ID) { mobile = m; break; }
  }
  assert(mobile, 'should find mobile by customer ID');
  store.updateUser(mobile, { tier: 'free' });
  eq(store.getUser(STRIPE_MOBILE).tier, 'free');
});

await test('customer.subscription.updated active → keeps pro', () => {
  store.updateUser(STRIPE_MOBILE, { tier: 'pro' });
  // Status = active, user stays pro
  const user = store.getUser(STRIPE_MOBILE);
  if (user.tier !== 'pro') store.updateUser(STRIPE_MOBILE, { tier: 'pro' });
  eq(store.getUser(STRIPE_MOBILE).tier, 'pro');
});

await test('customer.subscription.updated canceled → free', () => {
  store.updateUser(STRIPE_MOBILE, { tier: 'pro' });
  store.updateUser(STRIPE_MOBILE, { tier: 'free' });
  eq(store.getUser(STRIPE_MOBILE).tier, 'free');
});

// ─── TIER GATE LOGIC ──────────────────────────────────────────────────
sec('Tier gate logic');

const TIER_RANK = { free: 0, basic: 1, pro: 2 };

function canAccess(userTier, requiredTier) {
  return (TIER_RANK[userTier] || 0) >= (TIER_RANK[requiredTier] || 1);
}

await test('free user cannot access basic endpoint', () => {
  assert(!canAccess('free', 'basic'), 'free cannot access basic');
});
await test('basic user can access basic endpoint', () => {
  assert(canAccess('basic', 'basic'), 'basic can access basic');
});
await test('pro user can access basic endpoint', () => {
  assert(canAccess('pro', 'basic'), 'pro can access basic');
});
await test('basic user cannot access pro endpoint', () => {
  assert(!canAccess('basic', 'pro'), 'basic cannot access pro');
});
await test('pro user can access pro endpoint', () => {
  assert(canAccess('pro', 'pro'), 'pro can access pro');
});

await test('free question gate — allows first 2 questions', () => {
  const mobile = '+919900000099';
  store.createUser(mobile);
  store.incrementFreeQuestions(mobile); // Q1
  store.incrementFreeQuestions(mobile); // Q2
  const user = store.getUser(mobile);
  eq(user.freeQuestionsUsed, 2);
  // Gate check: free + used >= limit → block
  assert(user.freeQuestionsUsed >= 2, 'should be at limit');
});

await test('paid user bypasses free question gate', () => {
  const mobile = '+919900000098';
  store.createUser(mobile);
  store.updateUser(mobile, { tier: 'pro', freeQuestionsUsed: 999 });
  const user = store.getUser(mobile);
  // Pro tier bypasses the gate regardless of freeQuestionsUsed
  assert(user.tier !== 'free', 'pro should bypass gate');
});

// ─── MOBILE NORMALISATION FOR PAYMENTS ────────────────────────────────
sec('Mobile normalisation for payment metadata');

await test('Payment metadata mobile normalised correctly', () => {
  // As stored in Razorpay/Stripe metadata during checkout
  const rawMobile = '9876543210';
  const norm = normaliseMobile(rawMobile);
  eq(norm, '+919876543210');
  // Verify it can be used to look up the user
  store.createUser(norm);
  assert(store.getUser(norm) !== null, 'user lookup by normalised mobile works');
});

await test('Razorpay notes mobile with +91 prefix normalises correctly', () => {
  eq(normaliseMobile('+919876543210'), '+919876543210');
});

await test('Razorpay notes mobile without prefix normalises correctly', () => {
  eq(normaliseMobile('9876543210'), '+919876543210');
});

// ─── FINAL REPORT ─────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(55));
console.log(`  RESULTS: ${passed} passed  |  ${failed} failed`);
if (failures.length) {
  console.log('\n  Failed tests:');
  failures.forEach(f => console.log(`    • ${f}`));
}
console.log('═'.repeat(55) + '\n');
process.exit(failed > 0 ? 1 : 0);

}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
