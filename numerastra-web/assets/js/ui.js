/* Numerastra — UI utilities
 * Depends on: config.js, api.js
 *
 * Exposes:
 *   window.Numerastra.ui.toast(msg, type)
 *   window.Numerastra.ui.initAuthChip()     — swaps "Sign in" for user initials when logged in
 */

(function(window) {
  'use strict';

  if (!window.Numerastra) window.Numerastra = {};

  /* ═══════════════════════════════════════════════════════════════
     TOAST NOTIFICATIONS
     ═══════════════════════════════════════════════════════════════ */

  let toastContainer = null;
  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.id = 'nv-toast-container';
    toastContainer.style.cssText = `
      position: fixed; top: 80px; right: 24px; z-index: 1000;
      display: flex; flex-direction: column; gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function toast(message, type) {
    type = type || 'info';
    const colours = {
      info:    { bg: 'rgba(217,120,48,0.10)',  border: '#D97830', text: '#A85018' },
      success: { bg: 'rgba(45,157,130,0.10)',  border: '#2D9D82', text: '#1F6B5A' },
      error:   { bg: 'rgba(180,51,42,0.10)',   border: '#B4332A', text: '#8A261F' },
      warning: { bg: 'rgba(199,122,15,0.10)',  border: '#C77A0F', text: '#8A540A' },
    }[type] || { bg: 'rgba(217,120,48,0.10)', border: '#D97830', text: '#A85018' };

    const el = document.createElement('div');
    el.style.cssText = `
      background: ${colours.bg}; color: ${colours.text};
      border: 1px solid ${colours.border}; border-radius: 8px;
      padding: 12px 18px; font-size: 14px; line-height: 1.4;
      max-width: 340px; pointer-events: auto;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      animation: nv-toast-in 220ms cubic-bezier(0.4,0,0.2,1) both;
      cursor: pointer;
    `;
    el.textContent = message;
    el.addEventListener('click', () => dismiss(el));
    ensureToastContainer().appendChild(el);
    setTimeout(() => dismiss(el), 4200);
  }

  function dismiss(el) {
    el.style.animation = 'nv-toast-out 180ms cubic-bezier(0.4,0,0.2,1) both';
    setTimeout(() => el.remove(), 200);
  }

  // Inject toast keyframes once
  const toastStyle = document.createElement('style');
  toastStyle.textContent = `
    @keyframes nv-toast-in  { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes nv-toast-out { from { opacity: 1; transform: translateX(0); }  to { opacity: 0; transform: translateX(20px); } }
  `;
  if (document.head) document.head.appendChild(toastStyle);

  /* ═══════════════════════════════════════════════════════════════
     AUTH CHIP — replaces "Sign in" with user initials when logged in
     ═══════════════════════════════════════════════════════════════ */

  function getInitials(user) {
    if (!user) return '?';
    if (user.email) return user.email.slice(0, 2).toUpperCase();
    if (user.mobile) return user.mobile.slice(-2);  // last 2 of mobile
    return '•';
  }

  function updateAuthChip() {
    const auth = window.Numerastra.auth;
    if (!auth) return;
    const loggedIn = auth.isLoggedIn();
    const user = auth.currentUser();

    // Find all Sign-in links in the header (both patterns: .btn-signin in new, .header-cta in old)
    const signInLinks = document.querySelectorAll(
      '.site-header a.btn-signin, .site-header a.header-cta, ' +
      '.site-header-mobile-dropdown a[href*="login"]'
    );

    signInLinks.forEach(link => {
      // Skip if already enhanced
      if (link.dataset.nvAuthChip === 'active') return;

      if (loggedIn && user) {
        const initials = getInitials(user);
        link.dataset.nvAuthChip = 'active';
        link.innerHTML = `
          <span style="display:inline-flex; align-items:center; gap:8px;">
            <span style="
              width: 28px; height: 28px; border-radius: 50%;
              background: #B8873A; color: #FBF6E7;
              display: inline-flex; align-items: center; justify-content: center;
              font-size: 12px; font-weight: 500; font-family: 'Crimson Text', serif;
            ">${initials}</span>
            <span style="font-size: 0.85rem;">Account</span>
          </span>
        `;
        link.style.cursor = 'pointer';
        link.removeAttribute('href');

        // Click to show mini-menu with sign out option
        link.addEventListener('click', e => {
          e.preventDefault();
          showAccountMenu(link);
        });
      } else if (link.dataset.nvAuthChip === 'active') {
        // Was logged in, now logged out — restore
        link.dataset.nvAuthChip = '';
        link.textContent = 'Sign in';
        link.href = link.closest('.pages') ? 'login.html' : '/pages/login.html';
      }
    });
  }

  function showAccountMenu(anchor) {
    // Remove any existing menu
    document.querySelectorAll('.nv-account-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'nv-account-menu';
    const user = window.Numerastra.auth.currentUser();
    menu.innerHTML = `
      <div style="padding: 14px 16px; border-bottom: 1px solid rgba(184,135,58,0.22);">
        <div style="font-size: 0.75rem; color: #8A7856; letter-spacing: 0.1em; text-transform: uppercase;">Signed in as</div>
        <div style="font-size: 0.9rem; color: #2B2319; margin-top: 4px; font-family: 'Crimson Text', serif;">${(user && (user.email || user.mobile)) || 'user'}</div>
        <div style="font-size: 0.75rem; color: #8A7856; margin-top: 2px; text-transform: capitalize;">${(user && user.tier) || 'free'} tier</div>
      </div>
      <div style="padding: 6px;">
        <a href="/pages/results.html" style="display: block; padding: 10px 14px; color: #5C4E38; font-size: 0.9rem; border-radius: 6px;">My reading</a>
        <a href="/pages/pricing.html" style="display: block; padding: 10px 14px; color: #5C4E38; font-size: 0.9rem; border-radius: 6px;">Plans &amp; billing</a>
        <button class="nv-signout" style="display: block; width: 100%; text-align: left; padding: 10px 14px; color: #B4332A; font-size: 0.9rem; border: none; background: none; cursor: pointer; border-radius: 6px;">Sign out</button>
      </div>
    `;
    menu.style.cssText = `
      position: absolute; top: calc(100% + 8px); right: 24px;
      background: #FBF6E7; border: 1px solid rgba(184,135,58,0.28);
      border-radius: 10px; min-width: 220px; z-index: 100;
      box-shadow: 0 12px 32px rgba(43,35,25,0.12);
      animation: nv-toast-in 180ms cubic-bezier(0.4,0,0.2,1) both;
    `;
    // Hover styles via JS
    menu.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.style.background = 'rgba(184,135,58,0.09)';
        if (el.tagName === 'A') el.style.color = '#B8873A';
      });
      el.addEventListener('mouseleave', () => {
        el.style.background = 'transparent';
        if (el.tagName === 'A' && !el.classList.contains('nv-signout')) el.style.color = '#5C4E38';
      });
    });

    document.querySelector('.site-header').appendChild(menu);

    // Sign-out handler
    menu.querySelector('.nv-signout').addEventListener('click', async () => {
      menu.remove();
      await window.Numerastra.auth.signOut();
      toast('Signed out', 'info');
      setTimeout(() => { window.location.href = '/'; }, 500);
    });

    // Click outside to close
    setTimeout(() => {
      const closeFn = e => {
        if (!menu.contains(e.target) && e.target !== anchor) {
          menu.remove();
          document.removeEventListener('click', closeFn);
        }
      };
      document.addEventListener('click', closeFn);
    }, 50);
  }

  function initAuthChip() {
    if (!window.Numerastra.auth) return;
    updateAuthChip();
    window.Numerastra.auth.onChange(updateAuthChip);
  }

  window.Numerastra.ui = {
    toast,
    updateAuthChip,
    initAuthChip,
  };

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthChip);
  } else {
    setTimeout(initAuthChip, 0);
  }
})(window);
