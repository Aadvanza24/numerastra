'use strict';

/**
 * AUTH SYSTEM TEST SUITE
 * Tests store, SMS normalisation, JWT, middleware, and full OTP flow
 * Run: node tests/auth.test.js
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-32-chars-minimum-here!!';
process.env.USE_MOCK_SMS = 'true';

const store  = require('../src/services/store');
const sms    = require('../src/services/sms');
const jwt    = require('../src/services/jwt');

let passed = 0; let failed = 0; const failures = [];

function test(label, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => { console.log(`  ✓  ${label}`); passed++; })
        .catch(e => { console.log(`  ✗  ${label} — ${e.message}`); failed++; failures.push(label); });
    }
    console.log(`  ✓  ${label}`); passed++;
  } catch (e) {
    console.log(`  ✗  ${label} — ${e.message}`); failed++; failures.push(label);
  }
  return Promise.resolve();
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function eq(a, b) { if (a !== b) throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function sec(s) { console.log(`\n── ${s} ${'─'.repeat(48 - s.length)}`); }

// ─── RUN ALL TESTS ────────────────────────────────────────────────────
async function run() {

// ─── MOBILE NORMALISATION ─────────────────────────────────────────────
sec('Mobile normalisation');

await test('10-digit Indian → E.164', () => {
  eq(sms.normaliseMobile('9876543210'), '+919876543210');
});
await test('11-digit with leading 0 → E.164', () => {
  eq(sms.normaliseMobile('09876543210'), '+919876543210');
});
await test('Already E.164 unchanged', () => {
  eq(sms.normaliseMobile('+919876543210'), '+919876543210');
});
await test('International number preserved', () => {
  eq(sms.normaliseMobile('+12025550123'), '+12025550123');
});
await test('Whitespace stripped', () => {
  eq(sms.normaliseMobile('98765 43210'), '+919876543210');
});
await test('Invalid number throws', () => {
  let threw = false;
  try { sms.normaliseMobile('123'); } catch { threw = true; }
  assert(threw, 'Should throw for short number');
});
await test('Indian number must start 6-9', () => {
  let threw = false;
  try { sms.validateMobile('1234567890'); } catch { threw = true; }
  assert(threw, 'Should reject number starting with 1');
});

// ─── STORE — USERS ────────────────────────────────────────────────────
sec('Store — users');

const TEST_MOBILE = '+919876543210';

await test('createUser returns valid user object', () => {
  const u = store.createUser(TEST_MOBILE, 'test@example.com');
  assert(u.id.startsWith('usr_'), 'id prefix');
  eq(u.mobile, TEST_MOBILE);
  eq(u.email, 'test@example.com');
  eq(u.tier, 'free');
  eq(u.freeQuestionsUsed, 0);
});
await test('getUser returns created user', () => {
  const u = store.getUser(TEST_MOBILE);
  assert(u !== null, 'user should exist');
  eq(u.mobile, TEST_MOBILE);
});
await test('getUser returns null for unknown mobile', () => {
  const u = store.getUser('+910000000000');
  eq(u, null);
});
await test('updateUser patches fields', () => {
  const u = store.updateUser(TEST_MOBILE, { tier: 'pro' });
  eq(u.tier, 'pro');
  // reset
  store.updateUser(TEST_MOBILE, { tier: 'free' });
});
await test('incrementFreeQuestions increments counter', () => {
  const before = store.getUser(TEST_MOBILE).freeQuestionsUsed;
  store.incrementFreeQuestions(TEST_MOBILE);
  const after = store.getUser(TEST_MOBILE).freeQuestionsUsed;
  eq(after, before + 1);
  // reset
  store.updateUser(TEST_MOBILE, { freeQuestionsUsed: 0 });
});

// ─── STORE — OTP ──────────────────────────────────────────────────────
sec('Store — OTP');

const OTP_MOBILE = '+919111111111';

await test('createOTP returns a 6-digit code', () => {
  const r = store.createOTP(OTP_MOBILE);
  assert(r.ok, 'createOTP should succeed');
  assert(/^\d{6}$/.test(r.code), 'code must be 6 digits');
  assert(r.expiresAt > Date.now(), 'expiresAt must be in the future');
});
await test('createOTP enforces 60s cooldown', () => {
  const r = store.createOTP(OTP_MOBILE);
  assert(!r.ok, 'should be blocked by cooldown');
  assert(r.error.includes('wait'), 'error message mentions wait');
});
await test('verifyOTP — wrong code returns error', () => {
  // Re-seed an OTP bypassing cooldown
  store._otps.set(OTP_MOBILE, {
    code: '123456', expiresAt: Date.now() + 600000,
    attempts: 0, lastSentAt: 0, sendCount: 1,
  });
  const r = store.verifyOTP(OTP_MOBILE, '999999');
  assert(!r.ok, 'wrong code should fail');
  assert(r.error.includes('Incorrect'), 'mentions incorrect');
});
await test('verifyOTP — correct code succeeds and deletes record', () => {
  store._otps.set(OTP_MOBILE, {
    code: '654321', expiresAt: Date.now() + 600000,
    attempts: 0, lastSentAt: 0, sendCount: 1,
  });
  const r = store.verifyOTP(OTP_MOBILE, '654321');
  assert(r.ok, 'correct code should succeed');
  assert(!store._otps.has(OTP_MOBILE), 'OTP should be consumed');
});
await test('verifyOTP — expired OTP fails', () => {
  store._otps.set(OTP_MOBILE, {
    code: '111111', expiresAt: Date.now() - 1000,
    attempts: 0, lastSentAt: 0, sendCount: 1,
  });
  const r = store.verifyOTP(OTP_MOBILE, '111111');
  assert(!r.ok, 'expired OTP should fail');
  assert(r.error.toLowerCase().includes('expir'), 'error mentions expiry');
});
await test('verifyOTP — exceeds max attempts locks out', () => {
  store._otps.set(OTP_MOBILE, {
    code: '222222', expiresAt: Date.now() + 600000,
    attempts: 5, lastSentAt: 0, sendCount: 1,
  });
  const r = store.verifyOTP(OTP_MOBILE, '000000');
  assert(!r.ok, 'should be locked out');
  assert(r.error.toLowerCase().includes('too many'), 'error mentions too many');
});
await test('verifyOTP — no OTP record returns error', () => {
  const r = store.verifyOTP('+910000000000', '123456');
  assert(!r.ok);
  assert(r.error.toLowerCase().includes('no otp'), 'error mentions no otp');
});

// ─── STORE — SESSIONS ─────────────────────────────────────────────────
sec('Store — sessions');

const TEST_JTI = 'test-jti-12345';
const FUTURE   = new Date(Date.now() + 86400000).toISOString();
const PAST     = new Date(Date.now() - 1000).toISOString();

await test('registerSession + isSessionValid returns true', () => {
  store.registerSession(TEST_JTI, 'usr_001', TEST_MOBILE, FUTURE);
  assert(store.isSessionValid(TEST_JTI), 'session should be valid');
});
await test('revokeSession makes isSessionValid return false', () => {
  store.revokeSession(TEST_JTI);
  assert(!store.isSessionValid(TEST_JTI), 'revoked session should be invalid');
});
await test('isSessionValid returns false for expired session', () => {
  store.registerSession('expired-jti', 'usr_001', TEST_MOBILE, PAST);
  assert(!store.isSessionValid('expired-jti'), 'expired session should be invalid');
});
await test('isSessionValid returns false for unknown JTI', () => {
  assert(!store.isSessionValid('nonexistent-jti'));
});
await test('revokeAllUserSessions revokes all sessions for a mobile', () => {
  store.registerSession('jti-a', 'usr_001', TEST_MOBILE, FUTURE);
  store.registerSession('jti-b', 'usr_001', TEST_MOBILE, FUTURE);
  store.revokeAllUserSessions(TEST_MOBILE);
  assert(!store.isSessionValid('jti-a'), 'jti-a should be revoked');
  assert(!store.isSessionValid('jti-b'), 'jti-b should be revoked');
});

// ─── JWT SERVICE ──────────────────────────────────────────────────────
sec('JWT service');

const TEST_USER = store.createUser('+918888888888', 'jwt@test.com');

await test('issueTokens returns accessToken + refreshToken', () => {
  const t = jwt.issueTokens(TEST_USER);
  assert(typeof t.accessToken === 'string' && t.accessToken.length > 20, 'access token missing');
  assert(typeof t.refreshToken === 'string' && t.refreshToken.length > 20, 'refresh token missing');
  assert(typeof t.expiresAt === 'string', 'expiresAt missing');
});
await test('verifyToken decodes valid access token', () => {
  const t   = jwt.issueTokens(TEST_USER);
  const dec = jwt.verifyToken(t.accessToken);
  eq(dec.mobile, TEST_USER.mobile);
  eq(dec.sub, TEST_USER.id);
  assert(dec.jti, 'jti should be in token');
});
await test('verifyToken rejects tampered token', () => {
  let threw = false;
  try { jwt.verifyToken('invalid.token.here'); } catch { threw = true; }
  assert(threw, 'tampered token should throw');
});
await test('verifyToken rejects after revokeToken', () => {
  const t   = jwt.issueTokens(TEST_USER);
  const dec = jwt.verifyToken(t.accessToken);
  jwt.revokeToken(dec.jti);
  let threw = false;
  try { jwt.verifyToken(t.accessToken); } catch { threw = true; }
  assert(threw, 'revoked token should throw');
});
await test('verifyRefreshToken rejects access token as refresh', () => {
  const t = jwt.issueTokens(TEST_USER);
  let threw = false;
  try { jwt.verifyRefreshToken(t.accessToken); } catch { threw = true; }
  assert(threw, 'access token must not pass as refresh token');
});
await test('verifyRefreshToken accepts valid refresh token', () => {
  const t   = jwt.issueTokens(TEST_USER);
  const dec = jwt.verifyRefreshToken(t.refreshToken);
  eq(dec.mobile, TEST_USER.mobile);
  eq(dec.type, 'refresh');
});

// ─── DEVICE FINGERPRINTING ────────────────────────────────────────────
sec('Device fingerprinting');

await test('First registration is not flagged', () => {
  const r = store.recordDevice('fp-abc', '+919001001001');
  assert(!r.flagged, 'first registration should not be flagged');
});
await test('Three different mobiles from same device flags it', () => {
  store.recordDevice('fp-xyz', '+919002002001');
  store.recordDevice('fp-xyz', '+919002002002');
  const r = store.recordDevice('fp-xyz', '+919002002003');
  assert(r.flagged, 'should be flagged at 3 mobiles');
  eq(r.uniqueMobiles, 3);
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

} // end run()

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
