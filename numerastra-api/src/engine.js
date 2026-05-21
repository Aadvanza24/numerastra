/**
 * NUMEROLOGY ENGINE v1.0
 * Supports: Pythagorean, Chaldean, Vedic (Ankashastra), Synthesis
 * Master numbers: 11, 22, 33 are NEVER incorrectly reduced
 */

// ─────────────────────────────────────────────
// ALPHABET MAPS
// ─────────────────────────────────────────────

const PYTHAGOREAN = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8
};

const CHALDEAN = {
  A:1,B:2,C:3,D:4,E:5,F:8,G:3,H:5,I:1,
  J:1,K:2,L:3,M:4,N:5,O:7,P:8,Q:1,R:2,
  S:3,T:4,U:6,V:6,W:6,X:5,Y:1,Z:7
};

// Vedic maps letters to planetary rulers (1-9, no 9 for Chaldean-influenced Vedic)
const VEDIC = {
  A:1,B:2,C:3,D:4,E:5,F:8,G:3,H:5,I:1,
  J:1,K:2,L:3,M:4,N:5,O:7,P:8,Q:1,R:2,
  S:3,T:4,U:6,V:6,W:6,X:5,Y:1,Z:7
};

// Vedic planetary rulers for life path / psychic numbers
const VEDIC_PLANETS = {
  1:'Sun (Surya)',2:'Moon (Chandra)',3:'Jupiter (Guru)',
  4:'Rahu (North Node)',5:'Mercury (Budh)',6:'Venus (Shukra)',
  7:'Ketu (South Node)',8:'Saturn (Shani)',9:'Mars (Mangal)'
};

const VOWELS = new Set(['A','E','I','O','U']);

// ─────────────────────────────────────────────
// CORE REDUCTION UTILITIES
// ─────────────────────────────────────────────

const MASTER_NUMBERS = new Set([11, 22, 33]);
const KARMIC_DEBT_NUMBERS = new Set([13, 14, 16, 19]);

/**
 * Reduce a number to single digit, preserving master numbers
 */
function reduce(n, preserveMasters = true) {
  if (preserveMasters && MASTER_NUMBERS.has(n)) return n;
  if (n <= 9) return n;
  const sum = String(n).split('').reduce((a, d) => a + parseInt(d), 0);
  return reduce(sum, preserveMasters);
}

/**
 * Reduce without preserving masters (for certain calculations)
 */
function reduceForce(n) {
  if (n <= 9) return n;
  const sum = String(n).split('').reduce((a, d) => a + parseInt(d), 0);
  return reduceForce(sum);
}

/**
 * Sum digits of a number before reducing (captures karmic debt)
 */
function digitSum(n) {
  return String(n).split('').reduce((a, d) => a + parseInt(d), 0);
}

/**
 * Get sub-number before final reduction (e.g. 29/11, 38/11)
 */
function withSub(n) {
  const reduced = reduce(n);
  if (reduced === n) return { value: reduced, sub: null };
  return { value: reduced, sub: n };
}

// ─────────────────────────────────────────────
// NAME PARSING
// ─────────────────────────────────────────────

function parseName(name) {
  const clean = name.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
  const letters = clean.replace(/\s/g, '').split('');
  const vowels = letters.filter(l => VOWELS.has(l));
  const consonants = letters.filter(l => !VOWELS.has(l));
  return { clean, letters, vowels, consonants };
}

function nameSum(letters, map) {
  return letters.reduce((sum, l) => sum + (map[l] || 0), 0);
}

// ─────────────────────────────────────────────
// DATE OF BIRTH PARSING
// ─────────────────────────────────────────────

function parseDOB(dob) {
  // Accepts: YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  let day, month, year;
  if (dob.includes('-') && dob.indexOf('-') === 4) {
    [year, month, day] = dob.split('-').map(Number);
  } else {
    const parts = dob.split(/[-\/]/).map(Number);
    [day, month, year] = parts;
  }
  return { day, month, year };
}

// ─────────────────────────────────────────────
// PYTHAGOREAN CALCULATIONS
// ─────────────────────────────────────────────

function pythagoreanNumbers(name, dob) {
  const { day, month, year } = parseDOB(dob);
  const { letters, vowels, consonants } = parseName(name);

  // Life Path — reduce each component separately, then sum
  const dayR = reduce(day);
  const monthR = reduce(month);
  const yearDigits = String(year).split('').reduce((a,d) => a + parseInt(d), 0);
  const yearR = reduce(yearDigits);
  const lpSum = dayR + monthR + yearR;
  const lifePath = reduce(lpSum);

  // Check karmic debt on unreduced LP sum
  const lpKarmic = KARMIC_DEBT_NUMBERS.has(lpSum) ? lpSum : null;

  // Expression / Destiny — full name
  const exprSum = nameSum(letters, PYTHAGOREAN);
  const expression = reduce(exprSum);
  const exprKarmic = KARMIC_DEBT_NUMBERS.has(exprSum) ? exprSum : null;

  // Soul Urge (Heart's Desire) — vowels only
  const soulSum = nameSum(vowels, PYTHAGOREAN);
  const soulUrge = reduce(soulSum);

  // Personality — consonants only
  const personalitySum = nameSum(consonants, PYTHAGOREAN);
  const personality = reduce(personalitySum);

  // Birthday number (just the day, reduced)
  const birthday = reduce(day);

  // Maturity number
  const maturity = reduce(lifePath + expression);

  // Balance number (first letter of each name part)
  const nameParts = name.toUpperCase().trim().split(/\s+/);
  const balanceSum = nameParts.reduce((s, part) => {
    const first = part.replace(/[^A-Z]/g,'')[0];
    return s + (PYTHAGOREAN[first] || 0);
  }, 0);
  const balance = reduce(balanceSum);

  // Pinnacles (4 major life phases)
  const pinnacles = calcPinnacles(day, month, year, lifePath);

  // Challenges
  const challenges = calcChallenges(day, month, year);

  // Personal year (current)
  const currentYear = new Date().getFullYear();
  const personalYear = reduce(reduce(month) + reduce(day) + reduce(digitSum(currentYear)));

  // Personal month
  const currentMonth = new Date().getMonth() + 1;
  const personalMonth = reduce(personalYear + reduce(currentMonth));

  // Personal day
  const currentDay = new Date().getDate();
  const personalDay = reduce(personalMonth + reduce(currentDay));

  return {
    system: 'Pythagorean',
    lifePath: { value: lifePath, sub: lpSum !== lifePath ? lpSum : null, karmic: lpKarmic },
    expression: { value: expression, sub: exprSum !== expression ? exprSum : null, karmic: exprKarmic },
    soulUrge: { value: soulUrge, sub: soulSum !== soulUrge ? soulSum : null },
    personality: { value: personality, sub: personalitySum !== personality ? personalitySum : null },
    birthday,
    maturity,
    balance,
    pinnacles,
    challenges,
    personalYear,
    personalMonth,
    personalDay,
    isMaster: {
      lifePath: MASTER_NUMBERS.has(lifePath),
      expression: MASTER_NUMBERS.has(expression),
      soulUrge: MASTER_NUMBERS.has(soulUrge),
    }
  };
}

// ─────────────────────────────────────────────
// CHALDEAN CALCULATIONS
// ─────────────────────────────────────────────

function chaldeanNumbers(name, dob) {
  const { day, month, year } = parseDOB(dob);
  const { letters, vowels, consonants } = parseName(name);

  // Chaldean uses day only for psychic number (like Vedic)
  const psychic = reduce(day);

  // Destiny — full DOB sum
  const dobSum = day + month + year;
  const destiny = reduce(digitSum(dobSum));

  // Name number (full name, Chaldean values)
  const nameNumSum = nameSum(letters, CHALDEAN);
  const nameNumber = reduce(nameNumSum);

  // Soul / inner self — vowels
  const soulSum = nameSum(vowels, CHALDEAN);
  const soul = reduce(soulSum);

  // Personality — consonants
  const personalitySum = nameSum(consonants, CHALDEAN);
  const personality = reduce(personalitySum);

  // Compound name number (Chaldean does NOT reduce 10-52 the same way)
  // Shows the karmic influence of the compound number
  const compound = nameNumSum <= 9 ? null : nameNumSum;

  // Current name vs birth name: Chaldean places high value on this
  const vibrationalMatch = Math.abs(psychic - nameNumber) <= 1 ? 'harmonious' :
    Math.abs(psychic - nameNumber) <= 3 ? 'neutral' : 'discordant';

  return {
    system: 'Chaldean',
    psychic: { value: psychic, meaning: 'How you see yourself' },
    destiny: { value: destiny, meaning: 'How the world sees you' },
    nameNumber: { value: nameNumber, compound, meaning: 'Vibration of your name' },
    soul: { value: soul, meaning: 'Inner spiritual self' },
    personality: { value: personality, meaning: 'Outer personality' },
    vibrationalMatch,
    note: 'Chaldean does not use the number 9 for letter assignments. Master numbers 11, 22, 33 are preserved.'
  };
}

// ─────────────────────────────────────────────
// VEDIC (ANKASHASTRA) CALCULATIONS
// ─────────────────────────────────────────────

function vedicNumbers(name, dob) {
  const { day, month, year } = parseDOB(dob);
  const { letters, vowels, consonants } = parseName(name);

  // Moolank (psychic/root number) — day of birth only, reduced
  const moolank = reduce(day);
  const moolankPlanet = VEDIC_PLANETS[reduceForce(moolank)];

  // Bhagyank (destiny/luck number) — full DOB
  const dobFull = day + month + year;
  const bhagyankSum = String(day).split('').concat(
    String(month).split(''), String(year).split('')
  ).reduce((a,d) => a + parseInt(d), 0);
  const bhagyank = reduce(bhagyankSum);
  const bhagyankPlanet = VEDIC_PLANETS[reduceForce(bhagyank)];

  // Namank (name number) — Vedic/Chaldean system
  const namankSum = nameSum(letters, VEDIC);
  const namank = reduce(namankSum);

  // Kua number (Feng Shui integration, popular in Indian Vedic numerology)
  const kua = calcKuaNumber(year, 'M'); // default, gender passed separately

  // Missing numbers in name (karmic lessons)
  const presentNums = new Set(letters.map(l => VEDIC[l]).filter(Boolean));
  const missingNums = [1,2,3,4,5,6,7,8,9].filter(n => !presentNums.has(n));

  // Friendly / enemy / neutral numbers based on moolank
  const { friends, enemies, neutral } = getVedicRelationships(reduceForce(moolank));

  // Lo Shu Grid (Pythagorean square for Vedic)
  const loShu = calcLoShuGrid(day, month, year);

  // Yantra / lucky elements
  const luckyData = getVedicLucky(reduceForce(moolank));

  return {
    system: 'Vedic',
    moolank: { value: moolank, planet: moolankPlanet, meaning: 'Psychic / root number — how you are known' },
    bhagyank: { value: bhagyank, planet: bhagyankPlanet, meaning: 'Destiny / luck number — your karmic path' },
    namank: { value: namank, meaning: 'Name number vibration' },
    kua,
    missingNumbers: missingNums,
    relationships: { friends, enemies, neutral },
    loShu,
    lucky: luckyData,
    note: 'Vedic numerology emphasises Moolank and Bhagyank as the two primary numbers.'
  };
}

// ─────────────────────────────────────────────
// LO SHU GRID
// ─────────────────────────────────────────────

function calcLoShuGrid(day, month, year) {
  const digits = (String(day) + String(month) + String(year))
    .split('').map(Number).filter(d => d > 0);

  const grid = {};
  for (let i = 1; i <= 9; i++) grid[i] = 0;
  digits.forEach(d => { if (grid[d] !== undefined) grid[d]++; });

  // Planes
  const mental   = [4,9,2]; // top row
  const emotional = [3,5,7]; // middle row
  const practical = [8,1,6]; // bottom row
  const thoughtPlane = [4,3,8];
  const willPlane    = [9,5,1];
  const actionPlane  = [2,7,6];

  const planeScore = (nums) => nums.reduce((s,n) => s + grid[n], 0);

  return {
    grid,
    planes: {
      mental: planeScore(mental),
      emotional: planeScore(emotional),
      practical: planeScore(practical),
      thought: planeScore(thoughtPlane),
      will: planeScore(willPlane),
      action: planeScore(actionPlane),
    },
    missingInGrid: [1,2,3,4,5,6,7,8,9].filter(n => grid[n] === 0),
    arrows: calcLoShuArrows(grid)
  };
}

function calcLoShuArrows(grid) {
  const arrows = [];
  // Arrow of Determination: 1,5,9
  if (grid[1] && grid[5] && grid[9]) arrows.push({ name: 'Arrow of Determination', numbers: [1,5,9] });
  // Arrow of Spirituality: 3,5,7
  if (grid[3] && grid[5] && grid[7]) arrows.push({ name: 'Arrow of Spirituality', numbers: [3,5,7] });
  // Arrow of Intellect: 2,5,8
  if (grid[2] && grid[5] && grid[8]) arrows.push({ name: 'Arrow of Intellect', numbers: [2,5,8] });
  // Arrow of Will: 4,5,6
  if (grid[4] && grid[5] && grid[6]) arrows.push({ name: 'Arrow of Will', numbers: [4,5,6] });
  // Arrow of Activity: 1,2,3
  if (grid[1] && grid[2] && grid[3]) arrows.push({ name: 'Arrow of Activity', numbers: [1,2,3] });
  // Arrow of Planning: 4,7,8 (or 7,8,9)
  if (grid[7] && grid[8] && grid[9]) arrows.push({ name: 'Arrow of Planning', numbers: [7,8,9] });
  return arrows;
}

// ─────────────────────────────────────────────
// KUA NUMBER
// ─────────────────────────────────────────────

function calcKuaNumber(birthYear, gender) {
  const yy = String(birthYear).split('').reduce((a,d) => a + parseInt(d), 0);
  const yr = reduceForce(yy);
  if (gender === 'M' || gender === 'male') {
    const k = reduceForce(11 - yr);
    return k === 5 ? 2 : k;
  } else {
    const k = reduceForce(yr + 4);
    return k === 5 ? 8 : k;
  }
}

// ─────────────────────────────────────────────
// PINNACLES & CHALLENGES
// ─────────────────────────────────────────────

function calcPinnacles(day, month, year, lifePath) {
  const m = reduce(month);
  const d = reduce(day);
  const y = reduce(digitSum(year));

  const p1 = reduce(m + d);
  const p2 = reduce(d + y);
  const p3 = reduce(p1 + p2);
  const p4 = reduce(m + y);

  // Age ranges (36 - lifePath for first pinnacle end)
  const baseAge = 36 - reduceForce(lifePath);
  return [
    { number: p1, start: 0,          end: baseAge,     label: 'First pinnacle' },
    { number: p2, start: baseAge+1,  end: baseAge+9,   label: 'Second pinnacle' },
    { number: p3, start: baseAge+10, end: baseAge+18,  label: 'Third pinnacle' },
    { number: p4, start: baseAge+19, end: 99,          label: 'Fourth pinnacle' },
  ];
}

function calcChallenges(day, month, year) {
  const m = reduceForce(reduce(month));
  const d = reduceForce(reduce(day));
  const y = reduceForce(reduce(digitSum(year)));

  const c1 = Math.abs(m - d);
  const c2 = Math.abs(d - y);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(m - y);

  return [
    { number: c1, label: 'First challenge (youth)' },
    { number: c2, label: 'Second challenge (mid-life)' },
    { number: c3, label: 'Main challenge' },
    { number: c4, label: 'Fourth challenge (later life)' },
  ];
}

// ─────────────────────────────────────────────
// VEDIC RELATIONSHIPS & LUCKY DATA
// ─────────────────────────────────────────────

const VEDIC_RELATIONSHIPS = {
  1: { friends:[1,2,4,7], enemies:[6,8], neutral:[3,5,9] },
  2: { friends:[1,3,4],   enemies:[5,7,8], neutral:[2,6,9] },
  3: { friends:[1,2,3,9], enemies:[5,6], neutral:[4,7,8] },
  4: { friends:[1,2,7,8], enemies:[5,9], neutral:[3,4,6] },
  5: { friends:[1,4,5,6], enemies:[2,3,7], neutral:[8,9] },
  6: { friends:[4,5,6,8], enemies:[1,2], neutral:[3,7,9] },
  7: { friends:[1,2,4,7], enemies:[3,6,8], neutral:[5,9] },
  8: { friends:[4,5,6,8], enemies:[1,2], neutral:[3,7,9] },
  9: { friends:[1,3,6,9], enemies:[4,5,7], neutral:[2,8] }
};

function getVedicRelationships(n) {
  return VEDIC_RELATIONSHIPS[n] || { friends:[], enemies:[], neutral:[] };
}

const VEDIC_LUCKY = {
  1: { colours:['Gold','Orange','Yellow'],gems:['Ruby','Topaz'],days:['Sunday','Monday'],metal:'Gold',deity:'Surya',mantra:'Om Hreem Suryaya Namah' },
  2: { colours:['White','Cream','Silver'],gems:['Pearl','Moonstone'],days:['Monday'],metal:'Silver',deity:'Chandra',mantra:'Om Shreem Chandraya Namah' },
  3: { colours:['Yellow','Gold'],gems:['Yellow Sapphire','Citrine'],days:['Thursday'],metal:'Gold',deity:'Guru Brihaspati',mantra:'Om Graam Greem Graum Sah Gurave Namah' },
  4: { colours:['Blue','Electric Blue','Grey'],gems:["Hessonite (Gomed)"],days:['Saturday','Sunday'],metal:'Mixed metal',deity:'Rahu',mantra:'Om Raam Rahave Namah' },
  5: { colours:['Green','Parrot Green'],gems:['Emerald','Peridot'],days:['Wednesday'],metal:'Gold',deity:'Budh Mercury',mantra:'Om Braam Breem Braum Sah Budhaya Namah' },
  6: { colours:['White','Pink','Silver'],gems:['Diamond','White Sapphire','Opal'],days:['Friday'],metal:'Silver',deity:'Shukra Venus',mantra:'Om Draam Dreem Draum Sah Shukraya Namah' },
  7: { colours:['Cream','White','Light Yellow'],gems:["Cat's Eye (Lehsunia)"],days:['Monday','Sunday'],metal:'Mixed',deity:'Ketu',mantra:'Om Sraam Sreem Sraum Sah Ketave Namah' },
  8: { colours:['Black','Dark Blue','Purple'],gems:['Blue Sapphire (Neelam)','Amethyst'],days:['Saturday'],metal:'Iron/Steel',deity:'Shani Saturn',mantra:'Om Praam Preem Praum Sah Shanaye Namah' },
  9: { colours:['Red','Scarlet','Pink'],gems:['Red Coral (Moonga)'],days:['Tuesday'],metal:'Copper',deity:'Mangal Mars',mantra:'Om Kraam Kreem Kraum Sah Bhaumaya Namah' },
};

function getVedicLucky(n) {
  return VEDIC_LUCKY[n] || VEDIC_LUCKY[1];
}

// ─────────────────────────────────────────────
// BIORHYTHM
// ─────────────────────────────────────────────

function calcBiorhythm(dob, targetDate = new Date()) {
  const { day, month, year } = parseDOB(dob);
  const birth = new Date(year, month - 1, day);
  const days = Math.floor((targetDate - birth) / (1000 * 60 * 60 * 24));

  const physical   = Math.sin(2 * Math.PI * days / 23) * 100;
  const emotional  = Math.sin(2 * Math.PI * days / 28) * 100;
  const intellectual = Math.sin(2 * Math.PI * days / 33) * 100;
  const intuitive  = Math.sin(2 * Math.PI * days / 38) * 100;

  const score = (v) => Math.round(v);
  const state = (v) => v > 30 ? 'high' : v < -30 ? 'low' : 'transitioning';

  return {
    date: targetDate.toISOString().split('T')[0],
    daysSinceBirth: days,
    cycles: {
      physical:     { value: score(physical),     state: state(physical),     cycle: 23 },
      emotional:    { value: score(emotional),     state: state(emotional),    cycle: 28 },
      intellectual: { value: score(intellectual), state: state(intellectual), cycle: 33 },
      intuitive:    { value: score(intuitive),     state: state(intuitive),    cycle: 38 },
    },
    overall: score((physical + emotional + intellectual) / 3),
    criticalDay: [physical, emotional, intellectual].some(v => Math.abs(v) < 5)
  };
}

// ─────────────────────────────────────────────
// NAME CORRECTION ENGINE
// ─────────────────────────────────────────────

function analyseNameCorrection(name, dob, system = 'chaldean') {
  const map = system === 'pythagorean' ? PYTHAGOREAN : CHALDEAN;
  const { day } = parseDOB(dob);
  const psychic = reduceForce(reduce(day));

  const { letters } = parseName(name);
  const currentSum = nameSum(letters, map);
  const currentNumber = reduceForce(reduce(currentSum));

  // Ideal name numbers that harmonise with psychic number
  const ideal = VEDIC_RELATIONSHIPS[psychic]?.friends || [1,3,5];
  const isHarmonious = ideal.includes(currentNumber);

  // Suggest letter additions/changes if not harmonious
  const suggestions = [];
  if (!isHarmonious) {
    ideal.forEach(target => {
      // What needs to be added to reach target
      const needed = target - (currentSum % 9) + (currentSum % 9 > target ? 9 : 0);
      const addLetter = Object.entries(map).find(([,v]) => v === needed % 9 || v === needed);
      if (addLetter) {
        suggestions.push({
          targetNumber: target,
          suggestion: `Adding letter "${addLetter[0]}" to the name shifts vibration toward ${target}`,
          method: 'addition'
        });
      }
    });
  }

  return {
    currentNameNumber: currentNumber,
    currentSum,
    psychicNumber: psychic,
    harmonious: isHarmonious,
    harmonyLevel: isHarmonious ? 'excellent' :
      VEDIC_RELATIONSHIPS[psychic]?.neutral?.includes(currentNumber) ? 'neutral' : 'discordant',
    suggestions: isHarmonious ? [] : suggestions,
    system
  };
}

// ─────────────────────────────────────────────
// COMPATIBILITY ENGINE
// ─────────────────────────────────────────────

function calcCompatibility(person1, person2) {
  const lp1 = reduceForce(person1.lifePath);
  const lp2 = reduceForce(person2.lifePath);

  const { friends: f1, enemies: e1 } = getVedicRelationships(lp1);
  const { friends: f2, enemies: e2 } = getVedicRelationships(lp2);

  const mutual_friends = f1.includes(lp2) && f2.includes(lp1);
  const mutual_enemies = e1.includes(lp2) && e2.includes(lp1);
  const one_sided_positive = f1.includes(lp2) || f2.includes(lp1);

  let score, level, summary;
  if (mutual_friends) { score = 90; level = 'Excellent'; summary = 'Natural harmony — both numbers support each other'; }
  else if (mutual_enemies) { score = 25; level = 'Challenging'; summary = 'Friction is likely — significant effort required'; }
  else if (one_sided_positive) { score = 65; level = 'Good'; summary = 'One partner may give more — balance is needed'; }
  else { score = 50; level = 'Neutral'; summary = 'Neither magnetic nor repellent — built through shared effort'; }

  // Expression compatibility
  const ex1 = reduceForce(person1.expression);
  const ex2 = reduceForce(person2.expression);
  const exprCompat = getVedicRelationships(ex1).friends.includes(ex2) ? 'harmonious' : 'neutral';

  return {
    person1LifePath: lp1, person2LifePath: lp2,
    score, level, summary,
    expressionCompatibility: exprCompat,
    areas: {
      romance:  score + (mutual_friends ? 5 : 0),
      business: Math.min(95, score + (exprCompat === 'harmonious' ? 10 : 0)),
      friendship: Math.min(95, score + 10),
    },
    tip: mutual_enemies
      ? 'Focus on shared goals rather than personal differences.'
      : 'Celebrate what each brings to the relationship.'
  };
}

// ─────────────────────────────────────────────
// NUMBER / PROPERTY ANALYSIS (Mobile, Vehicle, House)
// ─────────────────────────────────────────────

function analyseNumber(numStr, ownerDOB) {
  const { day } = parseDOB(ownerDOB);
  const psychic = reduceForce(reduce(day));

  const digits = numStr.replace(/\D/g, '').split('').map(Number);
  const total = digits.reduce((a,b) => a+b, 0);
  const numberValue = reduce(total);
  const numberForced = reduceForce(numberValue);

  const { friends, enemies } = getVedicRelationships(psychic);
  const isLucky = friends.includes(numberForced);
  const isUnlucky = enemies.includes(numberForced);

  return {
    input: numStr,
    total,
    reduced: numberValue,
    singleDigit: numberForced,
    ownerPsychic: psychic,
    compatibility: isLucky ? 'lucky' : isUnlucky ? 'unlucky' : 'neutral',
    lucky: isLucky,
    score: isLucky ? 85 : isUnlucky ? 25 : 55,
    tip: isLucky
      ? `This number vibrates well with your psychic number ${psychic}.`
      : isUnlucky
      ? `This number creates friction with your psychic number ${psychic}. Consider alternatives.`
      : `This number is neutral for you.`
  };
}

// ─────────────────────────────────────────────
// SYNTHESIS VIEW — all 3 systems combined
// ─────────────────────────────────────────────

function synthesisView(pyth, chald, vedic) {
  const lpVedic = reduceForce(vedic.moolank.value);
  const lpPyth  = reduceForce(pyth.lifePath.value);
  const lpChald = reduceForce(chald.psychic.value);

  const allAgree = lpVedic === lpPyth && lpPyth === lpChald;
  const twoAgree = lpVedic === lpPyth || lpPyth === lpChald || lpVedic === lpChald;
  const dominant = allAgree ? lpVedic :
    (lpVedic === lpPyth ? lpVedic : lpPyth === lpChald ? lpPyth : lpVedic);

  const confidence = allAgree ? 'very high' : twoAgree ? 'high' : 'moderate';

  return {
    confidence,
    allSystemsAgree: allAgree,
    dominantNumber: dominant,
    summary: allAgree
      ? `All three systems confirm ${dominant}. This is a very strong and reliable reading.`
      : twoAgree
      ? `Two of three systems point to ${dominant}. This number carries significant weight.`
      : `Systems diverge — this person may experience different aspects of multiple numbers.`,
    bySystem: {
      pythagorean: { primary: lpPyth,  label: 'Life path' },
      chaldean:    { primary: lpChald, label: 'Psychic number' },
      vedic:       { primary: lpVedic, label: 'Moolank' },
    },
    keyInsight: `The synthesis number ${dominant} represents your strongest karmic blueprint across traditions.`
  };
}

// ─────────────────────────────────────────────
// MAIN CALCULATE FUNCTION
// ─────────────────────────────────────────────

function calculate(name, dob, gender = 'M') {
  if (!name || !dob) throw new Error('Name and date of birth are required.');

  const pyth  = pythagoreanNumbers(name, dob);
  const chald = chaldeanNumbers(name, dob);
  const ved   = vedicNumbers(name, dob);
  const synth = synthesisView(pyth, chald, ved);
  const bio   = calcBiorhythm(dob);
  const nameCorrection = analyseNameCorrection(name, dob, 'chaldean');

  // Override Kua with gender
  const { day, month, year } = parseDOB(dob);
  ved.kua = calcKuaNumber(year, gender);

  return {
    input: { name, dob, gender },
    pythagorean: pyth,
    chaldean: chald,
    vedic: ved,
    synthesis: synth,
    biorhythm: bio,
    nameCorrection,
    lucky: ved.lucky,
    loShu: ved.loShu,
    generatedAt: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

module.exports = {
  calculate,
  pythagoreanNumbers,
  chaldeanNumbers,
  vedicNumbers,
  synthesisView,
  calcBiorhythm,
  analyseNameCorrection,
  calcCompatibility,
  analyseNumber,
  calcLoShuGrid,
  calcKuaNumber,
  reduce,
  reduceForce,
  MASTER_NUMBERS,
  KARMIC_DEBT_NUMBERS,
  PYTHAGOREAN,
  CHALDEAN,
  VEDIC,
  VEDIC_PLANETS,
  VEDIC_LUCKY,
};
