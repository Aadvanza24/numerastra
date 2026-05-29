/* Numerastra — runtime config
 * Auto-detects dev vs prod based on hostname.
 * Loaded before engine.js in pages that call the API.
 */
(function() {
  'use strict';
  const host = (typeof window !== 'undefined' && window.location) ? window.location.hostname : '';
  // Dev hosts → localhost backend
  // Prod → api.thenumerastra.com
  let apiUrl;
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host === 'file' || host === '') {
    apiUrl = 'http://localhost:8080/api';
  } else if (host.includes('thenumerastra')) {
    apiUrl = 'https://api.thenumerastra.com/api';
  } else {
    // Preview environments or unknown — default to production API
    apiUrl = 'https://api.thenumerastra.com/api';
  }
  window.NumerastraConfig = {
    apiUrl,
    appUrl: (typeof window !== 'undefined' && window.location) ? window.location.origin : '',
    // Feature flags — can be toggled without a rebuild
    features: {
      enableAI:       true,
      enableRazorpay: true,
      enableStripe:   true,
    },
    // Razorpay publishable key (safe to expose client-side)
    razorpay: {
      keyId: 'rzp_test_placeholder',  // replace with live key post-launch
    },
  };
})();