'use strict';

/**
 * SMS PROVIDER SERVICE
 * Provider-agnostic OTP delivery.
 * Primary: MSG91 (India, cheapest, DLT-compliant)
 * Fallback: Twilio (international)
 * Dev mode: logs OTP to console, never sends real SMS
 */

const https = require('https');

const isDev = process.env.NODE_ENV !== 'production';

// ─── MOBILE NUMBER NORMALISATION ──────────────────────────────────────

/**
 * Normalise any Indian or international mobile to E.164 format
 * Examples:
 *   9876543210       → +919876543210
 *   09876543210      → +919876543210
 *   +919876543210    → +919876543210
 *   +12025550123     → +12025550123
 */
function normaliseMobile(raw) {
  const digits = raw.replace(/\D/g, '');

  // Already has country code (11+ digits starting with non-0)
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+' + digits;
  }
  // 10-digit Indian number
  if (digits.length === 10) {
    return '+91' + digits;
  }
  // 11-digit with leading 0 (Indian)
  if (digits.length === 11 && digits.startsWith('0')) {
    return '+91' + digits.slice(1);
  }
  // International — assume full number given
  if (digits.length >= 10) {
    return '+' + digits;
  }

  throw new Error('Invalid mobile number format. Please enter a 10-digit number.');
}

/**
 * Validate mobile — must be 10-15 digits after normalisation
 */
function validateMobile(mobile) {
  const norm = normaliseMobile(mobile);
  const digits = norm.replace('+', '');
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Mobile number must be 10–15 digits.');
  }
  // Indian mobiles must start with 6, 7, 8, or 9
  if (norm.startsWith('+91')) {
    const local = digits.slice(2);
    if (!/^[6-9]/.test(local)) {
      throw new Error('Please enter a valid Indian mobile number.');
    }
  }
  return norm;
}

// ─── MSG91 SENDER ─────────────────────────────────────────────────────

async function sendViaMSG91(mobile, otp) {
  const apiKey  = process.env.MSG91_API_KEY;
  const sender  = process.env.MSG91_SENDER_ID || 'NUMVDA';
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!apiKey) throw new Error('MSG91_API_KEY not configured');

  // MSG91 OTP API v5
  const payload = JSON.stringify({
    template_id: templateId,
    mobile: mobile.replace('+', ''),
    authkey: apiKey,
    otp,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'control.msg91.com',
      path: '/api/v5/otp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'authkey': apiKey,
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'success') {
            resolve({ provider: 'msg91', messageId: parsed.message });
          } else {
            reject(new Error(`MSG91 error: ${parsed.message || data}`));
          }
        } catch {
          reject(new Error(`MSG91 parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('MSG91 timeout')); });
    req.write(payload);
    req.end();
  });
}

// ─── TWILIO SENDER ────────────────────────────────────────────────────

async function sendViaTwilio(mobile, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials not configured');
  }

  const body = `Your Numerastra verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;
  const payload = new URLSearchParams({ To: mobile, From: from, Body: body }).toString();

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.sid) {
            resolve({ provider: 'twilio', messageId: parsed.sid });
          } else {
            reject(new Error(`Twilio error: ${parsed.message || data}`));
          }
        } catch {
          reject(new Error(`Twilio parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Twilio timeout')); });
    req.write(payload);
    req.end();
  });
}

// ─── MOCK SENDER (development) ────────────────────────────────────────

function sendViaMock(mobile, otp) {
  console.log('\n  ┌─────────────────────────────────────────┐');
  console.log(`  │  DEV OTP for ${mobile.padEnd(15)}          │`);
  console.log(`  │  Code: ${otp}                          │`);
  console.log('  └─────────────────────────────────────────┘\n');
  return Promise.resolve({ provider: 'mock', messageId: `mock_${Date.now()}` });
}

// ─── MAIN SEND FUNCTION ───────────────────────────────────────────────

/**
 * Send OTP to a mobile number.
 * Automatically selects provider:
 *   Dev mode   → mock (logs to console)
 *   India (+91) → MSG91 → fallback Twilio
 *   International → Twilio
 *
 * @returns { provider, messageId }
 */
async function sendOTP(mobile, otp) {
  if (isDev || process.env.USE_MOCK_SMS === 'true') {
    return sendViaMock(mobile, otp);
  }

  const isIndian = mobile.startsWith('+91');

  if (isIndian) {
    try {
      return await sendViaMSG91(mobile, otp);
    } catch (msg91Err) {
      console.warn('[SMS] MSG91 failed, falling back to Twilio:', msg91Err.message);
      return sendViaTwilio(mobile, otp);
    }
  }

  return sendViaTwilio(mobile, otp);
}

module.exports = { sendOTP, normaliseMobile, validateMobile };
