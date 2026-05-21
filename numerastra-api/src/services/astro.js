'use strict';

const { reduceForce } = require('../engine');

/**
 * ASTRO-NUMEROLOGY SERVICE
 * Zodiac sign from DOB, life path pairing, moon sign correlation,
 * universal year planetary overlay
 */

// Zodiac sign from birth date (no time needed)
const ZODIAC_DATES = [
  { sign: 'Capricorn', symbol: '♑', element: 'Earth', ruler: 'Saturn',    from: [12,22], to: [1,19],  num: 8 },
  { sign: 'Aquarius',  symbol: '♒', element: 'Air',   ruler: 'Uranus',    from: [1,20],  to: [2,18],  num: 4 },
  { sign: 'Pisces',    symbol: '♓', element: 'Water', ruler: 'Neptune',   from: [2,19],  to: [3,20],  num: 7 },
  { sign: 'Aries',     symbol: '♈', element: 'Fire',  ruler: 'Mars',      from: [3,21],  to: [4,19],  num: 9 },
  { sign: 'Taurus',    symbol: '♉', element: 'Earth', ruler: 'Venus',     from: [4,20],  to: [5,20],  num: 6 },
  { sign: 'Gemini',    symbol: '♊', element: 'Air',   ruler: 'Mercury',   from: [5,21],  to: [6,20],  num: 5 },
  { sign: 'Cancer',    symbol: '♋', element: 'Water', ruler: 'Moon',      from: [6,21],  to: [7,22],  num: 2 },
  { sign: 'Leo',       symbol: '♌', element: 'Fire',  ruler: 'Sun',       from: [7,23],  to: [8,22],  num: 1 },
  { sign: 'Virgo',     symbol: '♍', element: 'Earth', ruler: 'Mercury',   from: [8,23],  to: [9,22],  num: 5 },
  { sign: 'Libra',     symbol: '♎', element: 'Air',   ruler: 'Venus',     from: [9,23],  to: [10,22], num: 6 },
  { sign: 'Scorpio',   symbol: '♏', element: 'Water', ruler: 'Pluto',     from: [10,23], to: [11,21], num: 9 },
  { sign: 'Sagittarius',symbol:'♐', element: 'Fire',  ruler: 'Jupiter',   from: [11,22], to: [12,21], num: 3 },
];

// Life path → zodiac natural resonance
const LP_ZODIAC_RESONANCE = {
  1: { signs: ['Aries','Leo','Scorpio'],      theme: 'The Leader — initiative, independence, willpower' },
  2: { signs: ['Cancer','Libra','Pisces'],    theme: 'The Diplomat — sensitivity, partnership, intuition' },
  3: { signs: ['Gemini','Sagittarius','Leo'], theme: 'The Creator — expression, joy, communication' },
  4: { signs: ['Taurus','Virgo','Capricorn'], theme: 'The Builder — structure, discipline, reliability' },
  5: { signs: ['Gemini','Aquarius','Sagittarius'], theme: 'The Explorer — freedom, change, versatility' },
  6: { signs: ['Taurus','Libra','Cancer'],    theme: 'The Nurturer — responsibility, harmony, love' },
  7: { signs: ['Pisces','Virgo','Scorpio'],   theme: 'The Seeker — introspection, wisdom, analysis' },
  8: { signs: ['Capricorn','Scorpio','Taurus'], theme: 'The Achiever — power, material mastery, authority' },
  9: { signs: ['Pisces','Sagittarius','Aries'], theme: 'The Humanitarian — compassion, completion, service' },
};

// Moon sign approximate (simplified — sun sign table used as proxy without birth time)
// In production, integrate with a proper ephemeris API for exact moon sign
const MOON_SOUL_URGE = {
  // Moon sign → soul urge resonance
  Aries:       { resonates: [1,9],  quality: 'Bold emotional impulses. Needs action to feel fulfilled.' },
  Taurus:      { resonates: [4,6],  quality: 'Craves stability and sensory pleasure. Security is emotional currency.' },
  Gemini:      { resonates: [3,5],  quality: 'Needs mental stimulation and variety. Communication feeds the soul.' },
  Cancer:      { resonates: [2,6],  quality: 'Deep nurturer. Home and belonging are central emotional needs.' },
  Leo:         { resonates: [1,3],  quality: 'Needs creative expression and recognition. Leadership fulfils at soul level.' },
  Virgo:       { resonates: [4,7],  quality: 'Finds purpose in service and analysis. Perfection is the emotional goal.' },
  Libra:       { resonates: [2,6],  quality: 'Craves beauty, harmony, and partnership. Imbalance creates deep unease.' },
  Scorpio:     { resonates: [7,9],  quality: 'Intense emotional depths. Transformation and truth are soul necessities.' },
  Sagittarius: { resonates: [3,9],  quality: 'Freedom and philosophical quest feed the soul. Restriction is painful.' },
  Capricorn:   { resonates: [4,8],  quality: 'Achievement and legacy matter deeply. Purposeful ambition is the soul drive.' },
  Aquarius:    { resonates: [4,5],  quality: 'Humanitarian ideals and community fuel the soul. Uniqueness is sacred.' },
  Pisces:      { resonates: [2,7],  quality: 'Spiritual connection and empathy are core needs. Boundaries are a learning.' },
};

/**
 * Get zodiac sign from month and day
 */
function getZodiacSign(month, day) {
  for (const z of ZODIAC_DATES) {
    const [fm, fd] = z.from;
    const [tm, td] = z.to;
    if (
      (month === fm && day >= fd) ||
      (month === tm && day <= td) ||
      // Capricorn wraps year
      (z.sign === 'Capricorn' && (month === 12 && day >= 22))
    ) {
      return z;
    }
  }
  // Default fallback
  return ZODIAC_DATES.find(z => z.sign === 'Capricorn');
}

/**
 * Full astro-numerology crossover analysis
 */
function getAstroNumerology(lifePath, soulUrge, month, day) {
  const lp  = reduceForce(lifePath);
  const su  = reduceForce(soulUrge);
  const zodiac = getZodiacSign(month, day);
  const lpResonance = LP_ZODIAC_RESONANCE[lp] || LP_ZODIAC_RESONANCE[1];
  const moonData    = MOON_SOUL_URGE[zodiac.sign] || MOON_SOUL_URGE['Aries'];

  // Zodiac-LP alignment check
  const zodiacAligned = lpResonance.signs.includes(zodiac.sign);

  // Soul urge vs moon sign resonance
  const moonSoulAligned = moonData.resonates.includes(su);

  // Planetary ruler of life path vs zodiac ruler
  const lpPlanet  = getPlanetForNumber(lp);
  const zodiacRuler = zodiac.ruler;
  const planetMatch = lpPlanet.toLowerCase() === zodiacRuler.toLowerCase() ||
    arePlanetsLinked(lpPlanet, zodiacRuler);

  // Overall alignment score
  let alignmentScore = 50;
  if (zodiacAligned) alignmentScore += 25;
  if (moonSoulAligned) alignmentScore += 15;
  if (planetMatch) alignmentScore += 10;

  return {
    zodiac: {
      sign:    zodiac.sign,
      symbol:  zodiac.symbol,
      element: zodiac.element,
      ruler:   zodiac.ruler,
      numerologicalValue: zodiac.num,
    },
    lifePath: {
      value: lp,
      theme: lpResonance.theme,
      resonantSigns: lpResonance.signs,
      alignedWithZodiac: zodiacAligned,
    },
    soulUrge: {
      value: su,
      moonSignResonance: moonData.quality,
      alignedWithMoonSign: moonSoulAligned,
    },
    planetaryAlignment: {
      lifePathPlanet: lpPlanet,
      zodiacRuler,
      aligned: planetMatch,
      insight: planetMatch
        ? `Your life path planet (${lpPlanet}) and zodiac ruler (${zodiacRuler}) are in resonance — a unified cosmic signature.`
        : `Your life path planet (${lpPlanet}) and zodiac ruler (${zodiacRuler}) are different — you carry two planetary energies that must be consciously integrated.`,
    },
    overallAlignment: {
      score: alignmentScore,
      level: alignmentScore >= 80 ? 'highly aligned' : alignmentScore >= 60 ? 'moderately aligned' : 'divergent',
      summary: buildAlignmentSummary(zodiac.sign, lp, su, zodiacAligned, moonSoulAligned, planetMatch),
    },
  };
}

function getPlanetForNumber(n) {
  const map = { 1:'Sun', 2:'Moon', 3:'Jupiter', 4:'Rahu', 5:'Mercury', 6:'Venus', 7:'Ketu', 8:'Saturn', 9:'Mars' };
  return map[n] || 'Sun';
}

function arePlanetsLinked(p1, p2) {
  // Functionally equivalent planet pairs
  const linked = [
    ['Sun','Moon'], ['Jupiter','Neptune'], ['Saturn','Uranus'],
    ['Mars','Pluto'], ['Mercury','Chiron'], ['Venus','Neptune'],
  ];
  const [a, b] = [p1.toLowerCase(), p2.toLowerCase()];
  return linked.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function buildAlignmentSummary(sign, lp, su, zodiacAligned, moonAligned, planetMatch) {
  const parts = [];
  if (zodiacAligned) {
    parts.push(`Your Life Path ${lp} finds natural expression through ${sign} energy — your zodiac sign amplifies your numerological purpose.`);
  } else {
    parts.push(`Your Life Path ${lp} and ${sign} energy are in productive tension — you carry complementary forces that create depth and complexity.`);
  }
  if (moonAligned) {
    parts.push(`Your Soul Urge ${su} resonates with ${sign}'s emotional signature — what you deeply desire aligns with your astrological emotional nature.`);
  } else {
    parts.push(`Your Soul Urge ${su} differs from the typical ${sign} emotional pattern — your inner desires may sometimes feel at odds with your outward personality.`);
  }
  return parts.join(' ');
}

/**
 * Simple zodiac compatibility (sun sign based)
 */
function getZodiacCompatibility(sign1, sign2) {
  const elements = { Fire: ['Aries','Leo','Sagittarius'], Earth: ['Taurus','Virgo','Capricorn'], Air: ['Gemini','Libra','Aquarius'], Water: ['Cancer','Scorpio','Pisces'] };
  const e1 = Object.entries(elements).find(([,v]) => v.includes(sign1))?.[0];
  const e2 = Object.entries(elements).find(([,v]) => v.includes(sign2))?.[0];

  const compatibility = {
    Fire_Fire: 85, Earth_Earth: 82, Air_Air: 80, Water_Water: 88,
    Fire_Air: 78, Air_Fire: 78, Earth_Water: 82, Water_Earth: 82,
    Fire_Earth: 55, Earth_Fire: 55, Air_Water: 50, Water_Air: 50,
    Fire_Water: 45, Water_Fire: 45, Earth_Air: 60, Air_Earth: 60,
  };

  const key = `${e1}_${e2}`;
  const score = compatibility[key] || 55;

  return {
    sign1, sign2, element1: e1, element2: e2,
    score,
    level: score >= 80 ? 'excellent' : score >= 65 ? 'good' : score >= 50 ? 'neutral' : 'challenging',
  };
}

module.exports = { getAstroNumerology, getZodiacSign, getZodiacCompatibility, LP_ZODIAC_RESONANCE, MOON_SOUL_URGE };
