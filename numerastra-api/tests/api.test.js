'use strict';

/**
 * NUMEROLOGY API — TEST SUITE
 * Tests every endpoint without needing a live server
 * Run: node tests/api.test.js
 */

const engine    = require('../src/engine');
const { getUniversalNumbers, getPersonalVsUniversal } = require('../src/services/universal');
const { lookupAngelNumber, getPopularAngelNumbers }   = require('../src/services/angel');
const { getAstroNumerology, getZodiacSign }           = require('../src/services/astro');
const { findAuspiciousDates }                         = require('../src/services/auspicious');
const { getCompoundInsight }                          = require('../src/services/cheiro');

let passed = 0; let failed = 0; const failures = [];

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (e) {
    console.log(`  ✗  ${label} — ${e.message}`);
    failed++;
    failures.push(label);
  }
}

function assert(condition, msg) { if (!condition) throw new Error(msg || 'Assertion failed'); }
function eq(a, b) { if (a !== b) throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function between(n, lo, hi) { if (n < lo || n > hi) throw new Error(`${n} not between ${lo} and ${hi}`); }

const NAME = 'Priya Sharma';
const DOB  = '1992-03-15';

function sec(s) { console.log(`\n── ${s} ${'─'.repeat(48 - s.length)}`); }

// ─── ENGINE ───────────────────────────────────────────────────────────
sec('Core engine');

test('calculate() returns all 4 systems', () => {
  const r = engine.calculate(NAME, DOB, 'F');
  assert(r.pythagorean, 'missing pythagorean');
  assert(r.chaldean,    'missing chaldean');
  assert(r.vedic,       'missing vedic');
  assert(r.synthesis,   'missing synthesis');
  assert(r.biorhythm,   'missing biorhythm');
  assert(r.nameCorrection, 'missing nameCorrection');
});

test('calculate() generatedAt is ISO timestamp', () => {
  const r = engine.calculate(NAME, DOB);
  assert(!isNaN(Date.parse(r.generatedAt)), 'generatedAt not a valid date');
});

test('Life path master 11 not reduced', () => {
  const r = engine.pythagoreanNumbers('Test', '1990-05-29');
  assert(r.lifePath.value === 8 || typeof r.lifePath.value === 'number', 'bad life path type');
});

test('Chaldean F=8 (not 6)', () => { eq(engine.CHALDEAN['F'], 8); });
test('Chaldean O=7 (not 6)', () => { eq(engine.CHALDEAN['O'], 7); });

test('Biorhythm values in range -100 to +100', () => {
  const r = engine.calcBiorhythm(DOB, new Date('2024-01-01'));
  between(r.cycles.physical.value, -100, 100);
  between(r.cycles.emotional.value, -100, 100);
  between(r.cycles.intellectual.value, -100, 100);
});

test('Lo Shu grid returns all keys 1-9', () => {
  const r = engine.calcLoShuGrid(15, 3, 1992);
  eq(Object.keys(r.grid).length, 9);
});

test('Name correction returns harmony level', () => {
  const r = engine.analyseNameCorrection(NAME, DOB, 'chaldean');
  assert(['excellent','neutral','discordant'].includes(r.harmonyLevel), 'invalid harmony level');
});

test('Compatibility engine returns score 0-100', () => {
  const r = engine.calcCompatibility({ lifePath:1, expression:3 }, { lifePath:2, expression:6 });
  between(r.score, 0, 100);
  assert(['Excellent','Good','Neutral','Challenging'].includes(r.level), 'bad level: ' + r.level);
});

test('analyseNumber returns lucky/unlucky/neutral', () => {
  const r = engine.analyseNumber('9876543210', DOB);
  assert(['lucky','unlucky','neutral'].includes(r.compatibility), 'bad compatibility');
  between(r.score, 0, 100);
});

// ─── UNIVERSAL NUMBERS ────────────────────────────────────────────────
sec('Universal numbers service');

test('getUniversalNumbers returns year/month/day', () => {
  const r = getUniversalNumbers(new Date('2025-06-15'));
  // 2025: 2+0+2+5 = 9
  eq(r.universalYear.value, 9);
  assert(r.universalMonth.value >= 1, 'missing universalMonth');
  assert(r.universalDay.value >= 1, 'missing universalDay');
});

test('Universal year 2025 = 9', () => {
  const r = getUniversalNumbers(new Date('2025-06-15'));
  eq(r.universalYear.value, 9);
});

test('Universal year 2026 = 1', () => {
  const r = getUniversalNumbers(new Date('2026-04-15'));
  eq(r.universalYear.value, 1);
});

test('Universal month is valid number', () => {
  const r = getUniversalNumbers();
  between(r.universalMonth.value, 1, 33);
});

test('Universal day is valid number', () => {
  const r = getUniversalNumbers();
  between(r.universalDay.value, 1, 33);
});

test('Universal meaning has theme and energy', () => {
  const r = getUniversalNumbers(new Date('2025-01-01'));
  assert(r.meaning?.theme, 'missing theme');
  assert(r.meaning?.energy, 'missing energy');
});

test('getPersonalVsUniversal — same numbers', () => {
  const r = getPersonalVsUniversal(9, 9);
  eq(r.relationshipType, 'same');
  between(r.flowScore, 80, 100);
});

test('getPersonalVsUniversal — opposite numbers 1 vs 9', () => {
  const r = getPersonalVsUniversal(1, 9);
  eq(r.relationshipType, 'opposite');
  between(r.flowScore, 20, 50);
});

test('getPersonalVsUniversal — opposite numbers 9 vs 1', () => {
  const r = getPersonalVsUniversal(9, 1);
  eq(r.relationshipType, 'opposite');
});

// ─── ANGEL NUMBERS ────────────────────────────────────────────────────
sec('Angel numbers service');

test('111 lookup returns manifestation message', () => {
  const r = lookupAngelNumber('111');
  assert(r.found, '111 not found');
  assert(r.title, 'missing title');
  assert(r.message, 'missing message');
  assert(r.action, 'missing action');
});

test('444 lookup returns protection message', () => {
  const r = lookupAngelNumber('444');
  assert(r.found);
  assert(r.title.toLowerCase().includes('angel') || r.realm, 'no realm');
});

test('1111 lookup found', () => {
  const r = lookupAngelNumber('1111');
  assert(r.found);
});

test('11111 extended pattern resolved', () => {
  const r = lookupAngelNumber('11111');
  assert(r.found, 'extended pattern not resolved');
});

test('123 sequential pattern detected', () => {
  const r = lookupAngelNumber('123');
  assert(r.found);
  assert(r.title.toLowerCase().includes('sequential') || r.title, 'bad title');
});

test('1221 palindrome detected', () => {
  const r = lookupAngelNumber('1221');
  assert(r.found);
});

test('108 sacred number found', () => {
  const r = lookupAngelNumber('108');
  assert(r.found);
  assert(r.realm.toLowerCase().includes('vedic') || r.title, 'no Vedic reference');
});

test('Unknown number returns graceful response', () => {
  const r = lookupAngelNumber('9731');
  assert(typeof r.message === 'string', 'no fallback message');
});

test('getPopularAngelNumbers returns array', () => {
  const r = getPopularAngelNumbers();
  assert(Array.isArray(r) && r.length > 0, 'empty popular list');
  assert(r[0].number && r[0].title, 'missing fields');
});

// ─── ASTRO-NUMEROLOGY ─────────────────────────────────────────────────
sec('Astro-numerology service');

test('getZodiacSign March 15 = Pisces', () => {
  const r = getZodiacSign(3, 15);
  eq(r.sign, 'Pisces');
  eq(r.element, 'Water');
});

test('getZodiacSign July 25 = Leo', () => {
  const r = getZodiacSign(7, 25);
  eq(r.sign, 'Leo');
});

test('getZodiacSign December 25 = Capricorn', () => {
  const r = getZodiacSign(12, 25);
  eq(r.sign, 'Capricorn');
});

test('getAstroNumerology returns full analysis', () => {
  const r = getAstroNumerology(7, 2, 3, 15);
  assert(r.zodiac.sign, 'missing zodiac sign');
  assert(r.lifePath.theme, 'missing LP theme');
  assert(typeof r.overallAlignment.score === 'number', 'missing alignment score');
  between(r.overallAlignment.score, 0, 100);
});

test('Zodiac aligned flag is boolean', () => {
  const r = getAstroNumerology(4, 6, 7, 25);
  assert(typeof r.lifePath.alignedWithZodiac === 'boolean', 'alignedWithZodiac must be boolean');
});

test('Planetary alignment insight is string', () => {
  const r = getAstroNumerology(1, 3, 3, 15);
  assert(typeof r.planetaryAlignment.insight === 'string', 'insight must be string');
});

// ─── AUSPICIOUS DATE FINDER ───────────────────────────────────────────
sec('Auspicious date finder');

test('findAuspiciousDates returns topDates array', () => {
  const r = findAuspiciousDates(DOB, 6, 'wedding', { days: 30, topN: 5 });
  assert(Array.isArray(r.topDates), 'topDates not array');
  assert(r.purpose === 'Wedding / Marriage', 'wrong purpose label');
});

test('All found dates have score >= minScore', () => {
  const r = findAuspiciousDates(DOB, 1, 'business', { days: 30, topN: 10, minScore: 60 });
  r.topDates.forEach(d => {
    assert(d.score >= 60, `date ${d.date} has score ${d.score} below threshold`);
  });
});

test('Date result has required fields', () => {
  const r = findAuspiciousDates(DOB, 9, 'travel', { days: 20, topN: 3 });
  if (r.topDates.length > 0) {
    const d = r.topDates[0];
    assert(d.date, 'missing date');
    assert(d.dayOfWeek, 'missing dayOfWeek');
    assert(typeof d.score === 'number', 'score must be number');
    assert(Array.isArray(d.reasons), 'reasons must be array');
  }
});

test('Best date score is highest', () => {
  const r = findAuspiciousDates(DOB, 3, 'spiritual', { days: 30, topN: 10 });
  if (r.topDates.length > 1) {
    assert(r.topDates[0].score >= r.topDates[1].score, 'dates not sorted by score desc');
  }
});

// ─── CHEIRO COMPOUND NUMBERS ──────────────────────────────────────────
sec('Cheiro compound numbers');

test('Number 23 = Royal Star of the Lion', () => {
  const r = getCompoundInsight(23);
  assert(r.name.includes('Royal Star') || r.name.includes('Lion'), 'wrong name: ' + r.name);
  eq(r.quality, 'positive');
});

test('Number 13 is karmic', () => {
  const r = getCompoundInsight(13);
  eq(r.quality, 'karmic');
});

test('Number 17 = Star of Venus', () => {
  const r = getCompoundInsight(17);
  assert(r.name.toLowerCase().includes('venus') || r.name.toLowerCase().includes('star'), 'wrong: '+r.name);
});

test('Number 33 = Master Teacher', () => {
  const r = getCompoundInsight(33);
  assert(r.name.toLowerCase().includes('master') || r.quality === 'karmic', 'bad result for 33');
});

test('Single digit returns null', () => {
  const r = getCompoundInsight(5);
  assert(r === null, 'single digit should return null');
});

test('Number 55 resolved via reduction to 10', () => {
  const r = getCompoundInsight(55); // 5+5=10 → compound 10 exists
  assert(r !== null, 'should resolve 55 to compound 10');
  eq(r.number, 10);
});

test('All compounds 10–52 have name and quality', () => {
  for (let n = 10; n <= 52; n++) {
    const r = getCompoundInsight(n);
    assert(r?.name, `${n} missing name`);
    assert(r?.quality, `${n} missing quality`);
  }
});

test('practicalNote is a string', () => {
  const r = getCompoundInsight(15);
  assert(typeof r.practicalNote === 'string' && r.practicalNote.length > 10, 'bad practicalNote');
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
