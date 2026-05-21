'use strict';

const { reduce, reduceForce } = require('../engine');

/**
 * UNIVERSAL NUMBERS SERVICE
 * Global energy numbers — independent of the individual
 * Universal Year = sum of all digits in the calendar year
 * Universal Month = Universal Year + current month, reduced
 * Universal Day  = Universal Month + current day, reduced
 */

const UNIVERSAL_YEAR_MEANINGS = {
  1: { theme: 'New beginnings & independence', energy: 'Pioneering', worldFocus: 'Innovation, new leaders emerge, fresh starts globally. A year to plant seeds.', opportunities: ['Start new ventures', 'Take bold initiatives', 'Establish independence'], caution: 'Avoid ego-driven decisions. Collaboration still matters even in a "1" year.' },
  2: { theme: 'Cooperation & diplomacy', energy: 'Balancing', worldFocus: 'Partnerships, negotiations, and peace efforts dominate. Relationships tested and strengthened.', opportunities: ['Form alliances', 'Diplomatic solutions', 'Deepen personal bonds'], caution: 'Avoid confrontation. Patience is rewarded. Rushing creates friction.' },
  3: { theme: 'Creativity & expression', energy: 'Expanding', worldFocus: 'Arts, communication, and social connection flourish. Creative industries surge. Optimism spreads.', opportunities: ['Create and publish', 'Social expansion', 'Joyful celebration'], caution: 'Watch for scattered energy. Focus matters more than ever in a 3 year.' },
  4: { theme: 'Structure & hard work', energy: 'Building', worldFocus: 'Systems, foundations, and discipline are tested. Economies stabilise or restructure. Order sought.', opportunities: ['Build lasting systems', 'Hard work pays off', 'Establish routines'], caution: 'Rigidity backfires. Be thorough but adaptable. Shortcuts unravel.' },
  5: { theme: 'Change & freedom', energy: 'Shifting', worldFocus: 'Major global shifts. Travel, technology, and communication transform. Unexpected changes.', opportunities: ['Embrace the unexpected', 'Innovate', 'Expand freedom'], caution: 'Instability is real. Ground yourself. Not the year for reckless risks.' },
  6: { theme: 'Responsibility & healing', energy: 'Nurturing', worldFocus: 'Family, community, health, and environment take centre stage. Service to others rewarded.', opportunities: ['Strengthen family bonds', 'Community building', 'Health focus'], caution: 'Avoid over-responsibility. You cannot carry everyone. Self-care is not selfish.' },
  7: { theme: 'Inner wisdom & analysis', energy: 'Reflecting', worldFocus: 'Spiritual seeking, scientific discovery, and deeper questioning. Secrets may surface.', opportunities: ['Deep research', 'Spiritual growth', 'Seek inner truth'], caution: 'Isolation has limits. Share insights. Trust must be earned, not assumed.' },
  8: { theme: 'Power & material mastery', energy: 'Manifesting', worldFocus: 'Financial markets active. Power structures shift. Success for the disciplined. Justice themes.', opportunities: ['Financial growth', 'Claim authority', 'Reap past effort'], caution: 'Power corrupts if ego-driven. Give as much as you take. Karma is instant.' },
  9: { theme: 'Completion & compassion', energy: 'Releasing', worldFocus: 'Old cycles end. Humanitarian themes dominate. Global reflection. Endings precede new beginnings.', opportunities: ['Complete unfinished work', 'Release what no longer serves', 'Global service'], caution: 'Clinging to the past delays the future. Let go with grace.' },
  11: { theme: 'Illumination & spiritual awakening', energy: 'Awakening', worldFocus: 'Master year. Collective spiritual shift. Heightened intuition globally. Visionary ideas emerge.', opportunities: ['Spiritual leadership', 'Visionary projects', 'Inspire at scale'], caution: 'Emotional sensitivity is extreme. Ground the vision in practical action.' },
  22: { theme: 'Master building at scale', energy: 'Mastering', worldFocus: 'Rare master year. Systems, structures, and institutions built that last generations. High stakes.', opportunities: ['Build something lasting', 'Global impact', 'Leadership at scale'], caution: 'Pressure is immense. Break large goals into daily actions. Burnout is real.' },
};

const PERSONAL_VS_UNIVERSAL = {
  same: 'Your personal year number matches the universal energy. This is a year of deep alignment — what you need personally is supported by the world around you.',
  oneApart: 'Your personal year is one step ahead or behind the universal flow. Minor adjustments help you ride the wave rather than fight it.',
  opposite: 'Your personal energy is in tension with the universal year. You may feel out of sync with the world. This creates productive friction — your path is different, and that is okay.',
  neutral: 'Your personal year and the universal year are in neutral relationship. You operate somewhat independently of global trends this year.',
};

/**
 * Get universal numbers for any date
 */
function getUniversalNumbers(date = new Date()) {
  const year  = date.getFullYear();
  const month = date.getMonth() + 1;
  const day   = date.getDate();

  // Universal Year: sum all 4 year digits
  const uySum = String(year).split('').reduce((a, d) => a + Number(d), 0);
  const universalYear = reduce(uySum);

  // Universal Month: UY + current month
  const umSum = reduceForce(universalYear) + month;
  const universalMonth = reduce(umSum);

  // Universal Day: UM + current day
  const udSum = reduceForce(universalMonth) + day;
  const universalDay = reduce(udSum);

  const meaning = UNIVERSAL_YEAR_MEANINGS[universalYear] || UNIVERSAL_YEAR_MEANINGS[reduceForce(universalYear)];

  return {
    year,
    universalYear: { value: universalYear, sum: uySum, master: [11,22,33].includes(universalYear) },
    universalMonth: { value: universalMonth, sum: umSum },
    universalDay:   { value: universalDay,   sum: udSum },
    meaning,
    date: date.toISOString().split('T')[0],
  };
}

/**
 * Cross-reference personal year vs universal year
 */
function getPersonalVsUniversal(personalYear, universalYear) {
  const pv = reduceForce(personalYear);
  const uv = reduceForce(universalYear);

  let relationship, relationshipType;
  const diff = Math.abs(pv - uv);
  if (pv === uv) {
    relationshipType = 'same';
  } else if (diff === 8 || (pv === 1 && uv === 9) || (pv === 9 && uv === 1)) {
    // 1 and 9 are numerological opposites (beginning vs completion)
    relationshipType = 'opposite';
  } else if (diff === 1) {
    relationshipType = 'oneApart';
  } else {
    relationshipType = 'neutral';
  }

  relationship = PERSONAL_VS_UNIVERSAL[relationshipType];

  return {
    personalYear: pv,
    universalYear: uv,
    relationshipType,
    relationship,
    flowScore: relationshipType === 'same' ? 95 : relationshipType === 'oneApart' ? 70 : relationshipType === 'neutral' ? 55 : 35,
  };
}

module.exports = { getUniversalNumbers, getPersonalVsUniversal, UNIVERSAL_YEAR_MEANINGS };
