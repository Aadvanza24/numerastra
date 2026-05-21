'use strict';

const { reduce, reduceForce } = require('../engine');

/**
 * AUSPICIOUS DATE FINDER
 * Finds the best dates for specific purposes based on:
 * — Personal year / month / day numbers
 * — Universal year / month / day numbers
 * — Biorhythm peaks
 * — Vedic lucky days (planetary)
 */

const PURPOSE_IDEAL_NUMBERS = {
  wedding:       { ideal: [2,6,9], good: [1,3],  avoid: [4,8],  label: 'Wedding / Marriage' },
  business:      { ideal: [1,8,9], good: [3,6],  avoid: [2,7],  label: 'Business Launch' },
  travel:        { ideal: [3,5,9], good: [1,6],  avoid: [4,8],  label: 'Travel / Journey' },
  surgery:       { ideal: [6,2,4], good: [1,9],  avoid: [3,5],  label: 'Surgery / Medical' },
  signing:       { ideal: [1,4,8], good: [6,9],  avoid: [5,7],  label: 'Contract Signing' },
  investment:    { ideal: [8,1,6], good: [3,9],  avoid: [2,7],  label: 'Investment / Finance' },
  newbeginning:  { ideal: [1,9,5], good: [3,8],  avoid: [4,7],  label: 'New Beginning / Move' },
  education:     { ideal: [3,7,5], good: [1,9],  avoid: [4,8],  label: 'Education / Study' },
  spiritual:     { ideal: [7,9,3], good: [2,6],  avoid: [1,8],  label: 'Spiritual / Prayer' },
  property:      { ideal: [4,6,8], good: [1,9],  avoid: [5,3],  label: 'Property / Real Estate' },
};

// Lucky days of the week per Vedic number (1=Mon,2=Tue,...,7=Sun)
const VEDIC_LUCKY_DAY = {
  1: [0,6],   // Sun, Mon (Sun & Mon)
  2: [0],     // Mon
  3: [3],     // Thu
  4: [5,6],   // Sat, Sun
  5: [2],     // Wed
  6: [4],     // Fri
  7: [0,6],   // Mon, Sun
  8: [5],     // Sat
  9: [1],     // Tue
};

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getPersonalDay(dob, targetDate) {
  const { d, m } = parseDOB(dob);
  const cy = targetDate.getFullYear();
  const cm = targetDate.getMonth() + 1;
  const cd = targetDate.getDate();

  const cyDigits = String(cy).split('').reduce((a, x) => a + Number(x), 0);
  const py = reduce(reduce(m) + reduce(d) + reduce(cyDigits));
  const pm = reduce(py + reduce(cm));
  const pd = reduce(pm + reduce(cd));
  return { personalYear: py, personalMonth: pm, personalDay: pd };
}

function getUniversalDay(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const uy = reduce(String(y).split('').reduce((a, x) => a + Number(x), 0));
  const um = reduce(reduceForce(uy) + m);
  const ud = reduce(reduceForce(um) + d);
  return { universalYear: uy, universalMonth: um, universalDay: ud };
}

function getBiorhythmScore(dob, targetDate) {
  const { d, m, y } = parseDOB(dob);
  const birth = new Date(y, m - 1, d);
  const days = Math.floor((targetDate - birth) / 86400000);
  const phys = Math.sin(2 * Math.PI * days / 23) * 100;
  const emot = Math.sin(2 * Math.PI * days / 28) * 100;
  const intl = Math.sin(2 * Math.PI * days / 33) * 100;
  return Math.round((phys + emot + intl) / 3);
}

function parseDOB(dob) {
  let d, m, y;
  if (dob.includes('-') && dob.indexOf('-') === 4) {
    [y, m, d] = dob.split('-').map(Number);
  } else {
    [d, m, y] = dob.split(/[-\/]/).map(Number);
  }
  return { d, m, y };
}

function scoreDateForPurpose(dob, moolank, targetDate, purposeConfig) {
  const { ideal, good, avoid } = purposeConfig;
  const dow = targetDate.getDay();
  const { personalDay, personalMonth, personalYear } = getPersonalDay(dob, targetDate);
  const { universalDay, universalMonth } = getUniversalDay(targetDate);
  const bioScore = getBiorhythmScore(dob, targetDate);
  const mn = reduceForce(moolank);

  let score = 50;
  const reasons = [];
  const warnings = [];

  // Personal day scoring
  if (ideal.includes(reduceForce(personalDay))) { score += 20; reasons.push(`Personal day ${personalDay} is ideal for this purpose`); }
  else if (good.includes(reduceForce(personalDay))) { score += 10; reasons.push(`Personal day ${personalDay} is favourable`); }
  else if (avoid.includes(reduceForce(personalDay))) { score -= 15; warnings.push(`Personal day ${personalDay} is not ideal — friction likely`); }

  // Personal month bonus
  if (ideal.includes(reduceForce(personalMonth))) { score += 8; reasons.push(`Personal month ${personalMonth} supports this`); }

  // Universal day scoring
  if (ideal.includes(reduceForce(universalDay))) { score += 10; reasons.push(`Universal day ${universalDay} amplifies the energy`); }
  else if (avoid.includes(reduceForce(universalDay))) { score -= 8; warnings.push(`Universal day ${universalDay} creates global friction`); }

  // Vedic lucky day
  const luckyDays = VEDIC_LUCKY_DAY[mn] || [];
  if (luckyDays.includes(dow)) { score += 10; reasons.push(`${DAY_NAMES[dow]} is your Vedic lucky day`); }

  // Biorhythm bonus
  if (bioScore > 30) { score += 8; reasons.push(`Biorhythm is high (${bioScore > 0 ? '+' : ''}${bioScore}%) — energy levels strong`); }
  else if (bioScore < -30) { score -= 8; warnings.push(`Biorhythm is low (${bioScore}%) — energy may be depleted`); }

  // Personal year penalty/bonus
  if (ideal.includes(reduceForce(personalYear))) { score += 5; }

  score = Math.min(98, Math.max(10, score));

  return {
    date: targetDate.toISOString().split('T')[0],
    dayOfWeek: DAY_NAMES[dow],
    score,
    level: score >= 80 ? 'excellent' : score >= 65 ? 'good' : score >= 50 ? 'neutral' : 'avoid',
    personalDay, personalMonth, universalDay,
    biorhythm: bioScore,
    reasons,
    warnings,
  };
}

/**
 * Find the N best dates for a given purpose within a date range
 */
function findAuspiciousDates(dob, moolank, purpose, options = {}) {
  const {
    startDate = new Date(),
    days = 60,
    topN = 10,
    minScore = 60,
  } = options;

  const purposeConfig = PURPOSE_IDEAL_NUMBERS[purpose] || PURPOSE_IDEAL_NUMBERS['newbeginning'];
  const results = [];

  for (let i = 0; i < days; i++) {
    const candidate = new Date(startDate);
    candidate.setDate(startDate.getDate() + i);
    // Skip past dates
    if (candidate < new Date()) continue;

    const scored = scoreDateForPurpose(dob, moolank, candidate, purposeConfig);
    if (scored.score >= minScore) {
      results.push(scored);
    }
  }

  // Sort by score desc
  results.sort((a, b) => b.score - a.score);

  return {
    purpose: purposeConfig.label,
    searchedDays: days,
    found: results.length,
    topDates: results.slice(0, topN),
    bestDate: results[0] || null,
    moolank: reduceForce(moolank),
    note: 'Scores combine personal numerology cycles, universal energy, Vedic lucky days, and biorhythm. Higher = more auspicious.',
  };
}

module.exports = { findAuspiciousDates, PURPOSE_IDEAL_NUMBERS, scoreDateForPurpose };
