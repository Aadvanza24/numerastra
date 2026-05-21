/* Numerastra shared JS engine
   Usage: <script src="/assets/js/engine.js"></script>
   Exposes window.Numerastra with calculation utilities */

(function(window) {
  'use strict';

  const PYTH_MAP = { a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,
                    j:1,k:2,l:3,m:4,n:5,o:6,p:7,q:8,r:9,
                    s:1,t:2,u:3,v:4,w:5,x:6,y:7,z:8 };

  const CHAL_MAP = { a:1,b:2,c:3,d:4,e:5,f:8,g:3,h:5,i:1,
                    j:1,k:2,l:3,m:4,n:5,o:7,p:8,q:1,r:2,
                    s:3,t:4,u:6,v:6,w:6,x:5,y:1,z:7 };

  const VOWELS = new Set(['a','e','i','o','u']);
  const MASTER = new Set([11, 22, 33]);

  function reduce(n, keepMaster = true) {
    n = Math.abs(Math.floor(n));
    while (n > 9 && (!keepMaster || !MASTER.has(n))) {
      n = String(n).split('').reduce((s,d) => s + Number(d), 0);
    }
    return n;
  }

  function lettersOnly(s) {
    return (s || '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function parseDOB(dob) {
    let y, m, d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      [y, m, d] = dob.split('-').map(Number);
    } else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(dob)) {
      const parts = dob.split(/[\/\-]/).map(Number);
      d = parts[0]; m = parts[1]; y = parts[2];
    } else {
      throw new Error('Invalid date format');
    }
    return { day: d, month: m, year: y };
  }

  function lifePath(dob) {
    const { day, month, year } = parseDOB(dob);
    const dayR = reduce(day);
    const monthR = reduce(month);
    const yearR = reduce(year);
    return reduce(dayR + monthR + yearR);
  }

  function expressionPyth(name) {
    const letters = lettersOnly(name);
    const sum = letters.split('').reduce((s,l) => s + (PYTH_MAP[l] || 0), 0);
    return reduce(sum);
  }

  function soulUrgePyth(name) {
    const letters = lettersOnly(name);
    const sum = letters.split('')
      .filter(l => VOWELS.has(l))
      .reduce((s,l) => s + (PYTH_MAP[l] || 0), 0);
    return reduce(sum);
  }

  function personalityPyth(name) {
    const letters = lettersOnly(name);
    const sum = letters.split('')
      .filter(l => !VOWELS.has(l))
      .reduce((s,l) => s + (PYTH_MAP[l] || 0), 0);
    return reduce(sum);
  }

  function chaldeanPsychic(dob) {
    const { day } = parseDOB(dob);
    return reduce(day, false);  // psychic never master
  }

  function chaldeanDestiny(dob) {
    const { day, month, year } = parseDOB(dob);
    return reduce(day + month + year, false);
  }

  function chaldeanName(name) {
    const letters = lettersOnly(name);
    const sum = letters.split('').reduce((s,l) => s + (CHAL_MAP[l] || 0), 0);
    return reduce(sum, false);
  }

  function vedicMoolank(dob) {
    const { day } = parseDOB(dob);
    return reduce(day, false);
  }

  function vedicBhagyank(dob) {
    const { day, month, year } = parseDOB(dob);
    return reduce(day + month + year, false);
  }

  function getZodiac(dob) {
    const { day, month } = parseDOB(dob);
    const signs = [
      ['Capricorn',   12, 22, 1, 19, 'Saturn'],
      ['Aquarius',    1, 20, 2, 18, 'Uranus'],
      ['Pisces',      2, 19, 3, 20, 'Neptune'],
      ['Aries',       3, 21, 4, 19, 'Mars'],
      ['Taurus',      4, 20, 5, 20, 'Venus'],
      ['Gemini',      5, 21, 6, 20, 'Mercury'],
      ['Cancer',      6, 21, 7, 22, 'Moon'],
      ['Leo',         7, 23, 8, 22, 'Sun'],
      ['Virgo',       8, 23, 9, 22, 'Mercury'],
      ['Libra',       9, 23, 10, 22, 'Venus'],
      ['Scorpio',     10, 23, 11, 21, 'Pluto'],
      ['Sagittarius', 11, 22, 12, 21, 'Jupiter'],
    ];
    for (const [name, m1, d1, m2, d2, ruler] of signs) {
      if ((month === m1 && day >= d1) || (month === m2 && day <= d2)) {
        return { sign: name, ruler };
      }
    }
    return { sign: 'Capricorn', ruler: 'Saturn' };
  }

  // Life path meanings — single source of truth
  const LP_MEANINGS = {
    1:  { title: 'The Pioneer',   theme: 'Independent, original, assertive', color: '#E8847A' },
    2:  { title: 'The Diplomat',  theme: 'Cooperation, sensitivity, partnership', color: '#B5D4F4' },
    3:  { title: 'The Creator',   theme: 'Expression, joy, communication', color: '#E4C07F' },
    4:  { title: 'The Builder',   theme: 'Stability, discipline, foundation', color: '#97C459' },
    5:  { title: 'The Adventurer', theme: 'Freedom, change, versatility', color: '#F0997B' },
    6:  { title: 'The Nurturer',  theme: 'Love, harmony, responsibility', color: '#ED93B1' },
    7:  { title: 'The Seeker',    theme: 'Wisdom, introspection, spirituality', color: '#AFA9EC' },
    8:  { title: 'The Executive', theme: 'Power, ambition, material success', color: '#C9A55A' },
    9:  { title: 'The Humanitarian', theme: 'Compassion, completion, service', color: '#5DCAA5' },
    11: { title: 'The Illuminator', theme: 'Intuition, inspiration, spiritual mastery', color: '#E4C07F' },
    22: { title: 'The Master Builder', theme: 'Manifestation, large-scale impact', color: '#E4C07F' },
    33: { title: 'The Master Teacher', theme: 'Compassion, healing, universal love', color: '#E4C07F' },
  };

  const CHAL_MEANINGS = {
    1: 'Leader, Sun energy — bold, self-driven',
    2: 'Dreamer, Moon energy — sensitive, intuitive',
    3: 'Optimist, Jupiter — expansive, wise',
    4: 'Disciplined, Rahu — structured, analytical',
    5: 'Dynamic, Mercury — quick, communicative',
    6: 'Harmoniser, Venus — loving, artistic',
    7: 'Mystic, Ketu — introspective, spiritual',
    8: 'Powerful, Saturn — ambitious, disciplined',
    9: 'Warrior, Mars — passionate, pioneering',
  };

  function calcAll(name, dob) {
    const result = {
      name, dob,
      pythagorean: {
        lifePath:    lifePath(dob),
        expression:  expressionPyth(name),
        soulUrge:    soulUrgePyth(name),
        personality: personalityPyth(name),
      },
      chaldean: {
        psychic: chaldeanPsychic(dob),
        destiny: chaldeanDestiny(dob),
        name:    chaldeanName(name),
      },
      vedic: {
        moolank:  vedicMoolank(dob),
        bhagyank: vedicBhagyank(dob),
      },
      zodiac: getZodiac(dob),
    };
    // Synthesis — most-agreed number
    const votes = {};
    [result.pythagorean.lifePath, result.chaldean.destiny, result.vedic.bhagyank].forEach(n => {
      const k = String(n); votes[k] = (votes[k] || 0) + 1;
    });
    const [domNum, domCount] = Object.entries(votes).sort((a,b) => b[1] - a[1])[0];
    result.synthesis = {
      dominant: Number(domNum),
      confidence: domCount === 3 ? 'very high' : domCount === 2 ? 'high' : 'mixed',
      agreement: domCount,
    };
    return result;
  }

  // Persist / retrieve user calculation for cross-page access
  const STORAGE_KEY = 'numerastra_calc';
  function saveCalculation(calc) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(calc)); } catch {}
  }
  function loadCalculation() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  }
  function clearCalculation() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }

  // Mobile nav toggle — used across all pages
  function initMobileNav() {
    // Pattern A: new pages with explicit mobile toggle + menu
    const toggle = document.querySelector('.nav-mobile-toggle');
    const menu   = document.querySelector('.nav-mobile-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => menu.classList.toggle('open'));
    }

    // Pattern B: older pages that only have .site-header > .site-nav
    // Inject a hamburger + mobile dropdown at runtime so mobile users
    // aren't stranded with no navigation.
    const legacyHeader = document.querySelector('.site-header');
    const legacyNav    = legacyHeader && legacyHeader.querySelector(':scope > .site-nav');
    const hasNewPattern = legacyHeader && legacyHeader.querySelector('.nav-mobile-toggle');
    if (legacyNav && !hasNewPattern) {
      // Create hamburger button
      const btn = document.createElement('button');
      btn.className = 'site-header-mobile-toggle';
      btn.setAttribute('aria-label', 'Toggle menu');
      btn.textContent = '☰';

      // Create dropdown by cloning existing nav links
      const dropdown = document.createElement('div');
      dropdown.className = 'site-header-mobile-dropdown';
      legacyNav.querySelectorAll('a').forEach(a => {
        const clone = a.cloneNode(true);
        clone.className = '';  // drop "active" highlighting in dropdown
        dropdown.appendChild(clone);
      });
      // Include header-cta link if present
      const cta = legacyHeader.querySelector('.header-cta');
      if (cta) {
        const ctaClone = cta.cloneNode(true);
        ctaClone.className = '';
        dropdown.appendChild(ctaClone);
      }

      btn.addEventListener('click', () => dropdown.classList.toggle('open'));

      // Append button before .header-cta (or at end), dropdown at end of header
      if (cta) cta.parentNode.insertBefore(btn, cta);
      else legacyHeader.appendChild(btn);
      legacyHeader.appendChild(dropdown);
    }
  }

  // Format DOB for display
  function formatDOB(dob) {
    try {
      const { day, month, year } = parseDOB(dob);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${day} ${months[month-1]} ${year}`;
    } catch { return dob; }
  }

  // Public API — merge into existing Numerastra namespace (api, auth, ui already there)
  window.Numerastra = Object.assign(window.Numerastra || {}, {
    calcAll, lifePath, expressionPyth, soulUrgePyth, personalityPyth,
    chaldeanPsychic, chaldeanDestiny, chaldeanName,
    vedicMoolank, vedicBhagyank, getZodiac,
    reduce, parseDOB, formatDOB,
    LP_MEANINGS, CHAL_MEANINGS,
    saveCalculation, loadCalculation, clearCalculation,
    initMobileNav,
  });

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }
})(window);
