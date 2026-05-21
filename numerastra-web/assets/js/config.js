/* Numerastra — runtime config
 * Auto-detects dev vs prod based on hostname.
 * Loaded before engine.js in pages that call the API.
 */

(function() {
  'use strict';

  const host = (typeof window !== 'undefined' && window.location) ? window.location.hostname : '';

  // Dev hosts → localhost backend
  // Prod → api.numerastra.com
  let apiUrl;
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host === 'file' || host === '') {
    apiUrl = 'http://localhost:3000/api';
  } else if (host.includes('numerastra')) {
    apiUrl = 'https://api.numerastra.com/api';
  } else {
    // Preview environments or unknown — default to production API
    apiUrl = 'https://api.numerastra.com/api';
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
