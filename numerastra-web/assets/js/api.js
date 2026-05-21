/* Numerastra — API client + auth state manager
 * Depends on: config.js (must be loaded first)
 *
 * Exposes:
 *   window.Numerastra.api.*     — typed endpoint helpers
 *   window.Numerastra.auth.*    — login state, tokens
 *
 * Auth storage: localStorage['numerastra_auth'] = { accessToken, refreshToken, user, expiresAt }
 */

(function(window) {
  'use strict';

  if (!window.NumerastraConfig) {
    console.warn('[Numerastra] config.js must be loaded before api.js');
    return;
  }

  const { apiUrl } = window.NumerastraConfig;
  const STORAGE_KEY = 'numerastra_auth';

  /* ═══════════════════════════════════════════════════════════════
     AUTH STATE
     ═══════════════════════════════════════════════════════════════ */

  function getAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const auth = JSON.parse(raw);
      // Expire if accessToken is past its TTL
      if (auth.expiresAt && new Date(auth.expiresAt).getTime() < Date.now()) {
        // Don't clear yet — refresh() will try to renew. Caller should handle.
        auth.expired = true;
      }
      return auth;
    } catch {
      return null;
    }
  }

  function setAuth(auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    fireAuthChange();
  }

  function clearAuth() {
    localStorage.removeItem(STORAGE_KEY);
    fireAuthChange();
  }

  function isLoggedIn() {
    const a = getAuth();
    return !!(a && a.accessToken);
  }

  function currentUser() {
    const a = getAuth();
    return a ? a.user : null;
  }

  const authListeners = [];
  function onAuthChange(fn) { authListeners.push(fn); }
  function fireAuthChange() {
    authListeners.forEach(fn => { try { fn(getAuth()); } catch (e) { console.error(e); } });
  }

  /* ═══════════════════════════════════════════════════════════════
     HTTP HELPERS
     ═══════════════════════════════════════════════════════════════ */

  async function request(method, path, body, opts = {}) {
    const url = apiUrl + path;
    const headers = {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    };
    if (opts.auth !== false) {
      const a = getAuth();
      if (a && a.accessToken) headers['Authorization'] = 'Bearer ' + a.accessToken;
    }

    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new ApiError('Network error — check your connection', 0, 'network_error');
    }

    // Auto-refresh on 401 — but only for authenticated calls, and skip for
    // the auth endpoints themselves (/refresh, /otp/send, /otp/verify) to
    // avoid loops. /auth/me, /auth/logout should still auto-refresh.
    const skipRefresh = path === '/auth/refresh'
                     || path.startsWith('/auth/otp/');
    if (res.status === 401 && opts.auth !== false && !skipRefresh && !opts._retried) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return request(method, path, body, { ...opts, _retried: true });
      }
      // Refresh failed — clear auth so user gets signed out
      clearAuth();
    }

    let json;
    try {
      json = await res.json();
    } catch {
      throw new ApiError('Invalid response from server', res.status, 'parse_error');
    }

    if (!res.ok) {
      throw new ApiError(
        (json && (json.error || json.message)) || `Request failed (${res.status})`,
        res.status,
        json && json.code
      );
    }

    // API wraps success responses as { ok: true, data: ... }
    return json && json.data !== undefined ? json.data : json;
  }

  class ApiError extends Error {
    constructor(message, status, code) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  async function tryRefresh() {
    const a = getAuth();
    if (!a || !a.refreshToken) return false;
    try {
      const res = await fetch(apiUrl + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: a.refreshToken }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      const data = json.data || json;
      setAuth({
        accessToken:  data.accessToken,
        refreshToken: data.refreshToken || a.refreshToken,
        expiresAt:    data.expiresAt,
        user:         a.user,  // keep existing user object
      });
      return true;
    } catch {
      return false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     ENDPOINT HELPERS
     ═══════════════════════════════════════════════════════════════ */

  const api = {
    health:     () => request('GET', '/health', null, { auth: false }),

    // Auth
    sendOTP:    (mobile)        => request('POST', '/auth/otp/send',   { mobile }, { auth: false }),
    verifyOTP:  (mobile, otp)   => request('POST', '/auth/otp/verify', { mobile, otp }, { auth: false }),
    logout:     ()              => request('POST', '/auth/logout'),
    me:         ()              => request('GET',  '/auth/me'),

    // Engine
    calculate:  (name, dob, gender) => request('POST', '/calculate', { name, dob, gender }, { auth: false }),

    // Numerology lookups (Vedic remedy/check endpoints)
    analyseNumber: (number, dob)            => request('POST', '/remedy/number', { number, dob }, { auth: false }),
    analyseName:   (name, dob, system)      => request('POST', '/remedy/name',   { name, dob, system: system || 'chaldean' }, { auth: false }),
    compatibility: (person1, person2)       => request('POST', '/compatibility', { person1, person2 }, { auth: false }),

    // Remedies — number analysis (mobile / vehicle / house)
    analyseNumber: (number, dob) => request('POST', '/remedy/number', { number, dob }, { auth: false }),

    // Remedies — name correction
    analyseName:   (name, dob, system) => request('POST', '/remedy/name', { name, dob, system: system || 'chaldean' }, { auth: false }),

    // Compatibility — two-person reading
    compatibility: (person1, person2) => request('POST', '/compatibility', { person1, person2 }, { auth: false }),

    // AI guidance (requires auth + free-question gate)
    askAI:      (question, context) => request('POST', '/ai/ask', { question, context }),

    // Payments — Razorpay
    createRazorpayOrder: (plan) => request('POST', '/payments/razorpay/create-order', { plan }),
    captureRazorpay:     (payload) => request('POST', '/payments/razorpay/capture',     payload),

    // Payments — Stripe
    createStripeCheckout: (plan) => request('POST', '/payments/stripe/create-checkout', { plan }),
  };

  const auth = {
    get:          getAuth,
    set:          setAuth,
    clear:        clearAuth,
    isLoggedIn,
    currentUser,
    onChange:     onAuthChange,

    // High-level: OTP → verify → persist
    async login(mobile, otp) {
      const result = await api.verifyOTP(mobile, otp);
      setAuth({
        accessToken:  result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt:    result.expiresAt,
        user:         result.user,
        isNewUser:    result.isNewUser,
      });
      return result;
    },

    async signOut() {
      try { await api.logout(); } catch { /* ignore */ }
      clearAuth();
    },
  };

  window.Numerastra = window.Numerastra || {};
  window.Numerastra.api = api;
  window.Numerastra.auth = auth;
  window.Numerastra.ApiError = ApiError;

})(window);
