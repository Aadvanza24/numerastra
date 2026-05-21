'use strict';

const express  = require('express');
const { body, query, param } = require('express-validator');
const router   = express.Router();

const engine   = require('../engine');
const { getUniversalNumbers, getPersonalVsUniversal } = require('../services/universal');
const { lookupAngelNumber, getPopularAngelNumbers }   = require('../services/angel');
const { getAstroNumerology, getZodiacSign }           = require('../services/astro');
const { findAuspiciousDates, PURPOSE_IDEAL_NUMBERS }  = require('../services/auspicious');
const { getCompoundInsight, CHEIRO_COMPOUNDS }        = require('../services/cheiro');
const { validate, ok, err }                           = require('../middleware/validate');
const { optionalAuth, requireAuth,
        requireTier, freeQuestionGate }               = require('../middleware/auth');
const { incrementFreeQuestions }                      = require('../services/store');

// ─── COMMON VALIDATORS ────────────────────────────────────────────────
const vName = body('name')
  .isString().withMessage('Name must be a string')
  .trim().notEmpty().withMessage('Name is required')
  .isLength({ max: 200 }).withMessage('Name too long');

const vDob = body('dob')
  .isString().withMessage('DOB must be a string')
  .trim().notEmpty().withMessage('Date of birth is required')
  .matches(/^(\d{4}-\d{2}-\d{2}|\d{2}[\/\-]\d{2}[\/\-]\d{4})$/)
  .withMessage('DOB must be YYYY-MM-DD or DD/MM/YYYY');

const vGender = body('gender')
  .optional()
  .isIn(['M','F','male','female']).withMessage('Gender must be M or F');

// ═══════════════════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /health
 * Server health check
 */
router.get('/health', (req, res) => {
  ok(res, {
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    systems: ['pythagorean', 'chaldean', 'vedic', 'synthesis'],
    features: ['engine', 'universal', 'angel', 'astro', 'auspicious', 'cheiro'],
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CORE ENGINE
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /calculate
 * Full numerology calculation — all 4 systems
 * Body: { name, dob, gender? }
 */
router.post('/calculate',
  optionalAuth,
  [vName, vDob, vGender],
  validate,
  (req, res) => {
    try {
      const { name, dob, gender = 'M' } = req.body;
      const result = engine.calculate(name, dob, gender);
      ok(res, result, { cached: false });
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /calculate/pythagorean
 * Pythagorean system only
 */
router.post('/calculate/pythagorean',
  [vName, vDob],
  validate,
  (req, res) => {
    try {
      const result = engine.pythagoreanNumbers(req.body.name, req.body.dob);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /calculate/chaldean
 * Chaldean system only
 */
router.post('/calculate/chaldean',
  [vName, vDob],
  validate,
  (req, res) => {
    try {
      const result = engine.chaldeanNumbers(req.body.name, req.body.dob);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /calculate/vedic
 * Vedic / Ankashastra system only
 */
router.post('/calculate/vedic',
  [vName, vDob, vGender],
  validate,
  (req, res) => {
    try {
      const { name, dob, gender = 'M' } = req.body;
      const result = engine.vedicNumbers(name, dob, gender);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /calculate/biorhythm
 * Biorhythm for a DOB, optionally for a target date
 * Body: { dob, targetDate? }
 */
router.post('/calculate/biorhythm',
  [vDob],
  validate,
  (req, res) => {
    try {
      const target = req.body.targetDate ? new Date(req.body.targetDate) : new Date();
      if (isNaN(target)) return err(res, 'Invalid targetDate', 400);
      const result = engine.calcBiorhythm(req.body.dob, target);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /calculate/loshu
 * Lo Shu grid for a DOB
 * Body: { dob }
 */
router.post('/calculate/loshu',
  [vDob],
  validate,
  (req, res) => {
    try {
      const dob = req.body.dob;
      let d, m, y;
      if (dob.includes('-') && dob.indexOf('-') === 4) {
        [y, m, d] = dob.split('-').map(Number);
      } else {
        [d, m, y] = dob.split(/[-\/]/).map(Number);
      }
      const result = engine.calcLoShuGrid(d, m, y);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// REMEDIES
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /remedy/name
 * Name harmony check + remedy suggestions
 * Body: { name, dob, system? }
 */
router.post('/remedy/name',
  [vName, vDob, body('system').optional().isIn(['chaldean','pythagorean'])],
  validate,
  (req, res) => {
    try {
      const { name, dob, system = 'chaldean' } = req.body;
      const result = engine.analyseNameCorrection(name, dob, system);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /remedy/number
 * Mobile / vehicle / house number analysis
 * Body: { number, dob }
 */
router.post('/remedy/number',
  [
    body('number').isString().notEmpty().withMessage('Number string is required'),
    vDob,
  ],
  validate,
  (req, res) => {
    try {
      const result = engine.analyseNumber(req.body.number, req.body.dob);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /compatibility
 * Two-person compatibility analysis
 * Body: { person1: { lifePath, expression }, person2: { lifePath, expression } }
 */
router.post('/compatibility',
  [
    body('person1.lifePath').isInt({ min: 1, max: 33 }).withMessage('person1.lifePath must be 1–33'),
    body('person2.lifePath').isInt({ min: 1, max: 33 }).withMessage('person2.lifePath must be 1–33'),
  ],
  validate,
  (req, res) => {
    try {
      const result = engine.calcCompatibility(req.body.person1, req.body.person2);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// UNIVERSAL NUMBERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /universal
 * Universal year / month / day for today (or ?date=YYYY-MM-DD)
 */
router.get('/universal',
  [query('date').optional().isISO8601().withMessage('date must be YYYY-MM-DD')],
  validate,
  (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date) : new Date();
      const universal = getUniversalNumbers(date);
      ok(res, universal);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * POST /universal/personal-match
 * Compare personal year vs universal year
 * Body: { dob }
 */
router.post('/universal/personal-match',
  [vDob],
  validate,
  (req, res) => {
    try {
      const pyth    = engine.pythagoreanNumbers('Test', req.body.dob);
      const univ    = getUniversalNumbers();
      const match   = getPersonalVsUniversal(pyth.personalYear, univ.universalYear.value);
      ok(res, { personalYear: pyth.personalYear, ...match, universalMeaning: univ.meaning });
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// ANGEL NUMBERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /angel/:number
 * Look up an angel number meaning
 */
router.get('/angel/popular', (req, res) => {
  ok(res, getPopularAngelNumbers());
});

router.get('/angel/:number',
  [param('number').isString().notEmpty().withMessage('Number is required')],
  validate,
  (req, res) => {
    try {
      const result = lookupAngelNumber(req.params.number);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// ASTRO-NUMEROLOGY
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /astro
 * Zodiac + life path pairing + moon sign soul urge analysis
 * Body: { name, dob, gender? }
 */
router.post('/astro',
  [vName, vDob, vGender],
  validate,
  (req, res) => {
    try {
      const { name, dob, gender = 'M' } = req.body;
      const pyth   = engine.pythagoreanNumbers(name, dob);
      const vedic  = engine.vedicNumbers(name, dob, gender);
      let d, m;
      if (dob.indexOf('-') === 4) {
        [,m, d] = dob.split('-').map(Number);
      } else {
        [d, m] = dob.split(/[-\/]/).map(Number);
      }
      const astro  = getAstroNumerology(pyth.lp?.value || pyth.lifePath?.value, pyth.su?.value || pyth.soulUrge?.value, m, d);
      const univ   = getUniversalNumbers();
      const pvMatch = getPersonalVsUniversal(pyth.personalYear, univ.universalYear.value);
      ok(res, { astro, personalVsUniversal: pvMatch, universalYear: univ.universalYear });
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * GET /astro/zodiac/:month/:day
 * Get zodiac sign for a birth date
 */
router.get('/astro/zodiac/:month/:day',
  [
    param('month').isInt({ min: 1, max: 12 }),
    param('day').isInt({ min: 1, max: 31 }),
  ],
  validate,
  (req, res) => {
    try {
      const zodiac = getZodiacSign(Number(req.params.month), Number(req.params.day));
      ok(res, zodiac);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// AUSPICIOUS DATE FINDER
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /auspicious/purposes
 * List all supported purposes
 */
router.get('/auspicious/purposes', (req, res) => {
  ok(res, Object.entries(PURPOSE_IDEAL_NUMBERS).map(([key, v]) => ({
    key,
    label: v.label,
    idealNumbers: v.ideal,
    goodNumbers: v.good,
    avoidNumbers: v.avoid,
  })));
});

/**
 * POST /auspicious/find
 * Find best dates for a purpose
 * Body: { dob, moolank, purpose, days?, topN? }
 */
router.post('/auspicious/find',
  [
    vDob,
    body('moolank').isInt({ min: 1, max: 33 }).withMessage('moolank is required (1–33)'),
    body('purpose').isString().notEmpty().withMessage('purpose is required'),
    body('days').optional().isInt({ min: 7, max: 365 }),
    body('topN').optional().isInt({ min: 1, max: 30 }),
  ],
  validate,
  (req, res) => {
    try {
      const { dob, moolank, purpose, days = 60, topN = 10 } = req.body;
      if (!PURPOSE_IDEAL_NUMBERS[purpose]) {
        return err(res, `Unknown purpose "${purpose}". Use GET /auspicious/purposes for valid options.`, 400);
      }
      const result = findAuspiciousDates(dob, moolank, purpose, { days, topN });
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// CHEIRO COMPOUND NUMBERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /cheiro/:number
 * Get Cheiro compound meaning for a number
 */
router.get('/cheiro/all', (req, res) => {
  ok(res, Object.entries(CHEIRO_COMPOUNDS).map(([n, data]) => ({
    number: Number(n),
    name: data.name,
    quality: data.quality,
    keywords: data.keywords,
  })));
});

router.get('/cheiro/:number',
  [param('number').isInt({ min: 10, max: 999 }).withMessage('Number must be 10 or above')],
  validate,
  (req, res) => {
    try {
      const result = getCompoundInsight(Number(req.params.number));
      if (!result) return err(res, `No compound meaning for ${req.params.number}`, 404);
      ok(res, result);
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// UTILITY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /reduce
 * Reduce any number (with master number preservation option)
 * Body: { number, preserveMasters? }
 */
router.post('/reduce',
  [body('number').isInt({ min: 1 }).withMessage('number must be a positive integer')],
  validate,
  (req, res) => {
    try {
      const { number, preserveMasters = true } = req.body;
      const reduced = preserveMasters ? engine.reduce(number) : engine.reduceForce(number);
      ok(res, {
        input: number,
        reduced,
        isMaster: engine.MASTER_NUMBERS.has(reduced),
        isKarmic: engine.KARMIC_DEBT_NUMBERS.has(number),
        preservedMasters: preserveMasters,
      });
    } catch (e) {
      err(res, e.message, 400);
    }
  }
);

/**
 * GET /reference/planets
 * Vedic planetary rulers for all 9 numbers
 */
router.get('/reference/planets', (req, res) => {
  ok(res, engine.VEDIC_PLANETS);
});

/**
 * GET /reference/lucky/:number
 * Lucky elements for a Vedic number (1–9)
 */
router.get('/reference/lucky/:number',
  [param('number').isInt({ min: 1, max: 9 }).withMessage('Number must be 1–9')],
  validate,
  (req, res) => {
    const lucky = engine.VEDIC_LUCKY[Number(req.params.number)];
    if (!lucky) return err(res, 'Number not found', 404);
    ok(res, { number: Number(req.params.number), ...lucky });
  }
);

// ═══════════════════════════════════════════════════════════════════════
// AI GUIDANCE (protected — requires auth + free question gate)
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/ai/ask
 * Ask a personalised numerology question.
 * Free tier: 2 lifetime questions.
 * Basic: 10 questions.
 * Pro: unlimited.
 *
 * Body: { question, context: { name, dob, numbers? } }
 */
router.post('/ai/ask',
  requireAuth,
  freeQuestionGate,
  [
    body('question').isString().trim().notEmpty().withMessage('question is required')
      .isLength({ max: 500 }).withMessage('Question must be under 500 characters'),
    body('context.name').optional().isString(),
    body('context.dob').optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const { question, context = {} } = req.body;
      const { name, dob } = context;

      // Build numerology context for Claude
      let numerologyContext = '';
      if (name && dob) {
        try {
          const calc = engine.calculate(name, dob);
          const p = calc.pythagorean;
          const v = calc.vedic;
          const c = calc.chaldean;
          numerologyContext = `
User's name: ${name}
Date of birth: ${dob}
Life path number: ${p?.lifePath?.value ?? '—'}
Expression number: ${p?.expression?.value ?? '—'}
Soul urge number: ${p?.soulUrge?.value ?? '—'}
Personality number: ${p?.personality?.value ?? '—'}
Moolank (Vedic): ${v?.moolank?.value ?? '—'}, Planet: ${v?.moolank?.planet ?? '—'}
Bhagyank (Vedic): ${v?.bhagyank?.value ?? '—'}
Chaldean psychic: ${c?.psychic?.value ?? '—'}
Chaldean name vibration: ${c?.match ?? '—'}
Personal year (current): ${p?.personalYear ?? '—'}
Lucky colours: ${v?.lucky?.colours?.join(', ') ?? '—'}
Lucky gems: ${v?.lucky?.gems?.join(', ') ?? '—'}
Mantra: ${v?.lucky?.mantra ?? '—'}
`.trim();
        } catch { /* skip if calc fails */ }
      }

      const systemPrompt = `You are Numerastra's AI numerology guide — deeply knowledgeable in Pythagorean, Chaldean, and Vedic numerology systems, biorhythm cycles, Lo Shu grid, and astro-numerology. You are warm, insightful, and precise.

Your role is to give personalised numerological guidance based on the user's numbers. Always tie your answer directly to the specific numbers provided. Be practical — give actionable insight, not vague spiritual platitudes.

${numerologyContext ? `User's numerological profile:\n${numerologyContext}` : 'No profile provided — give general numerological guidance.'}

Guidelines:
- Keep answers concise but rich — 150 to 300 words
- Reference specific numbers from the profile
- If asked about remedies, draw from Vedic planetary tradition
- Never invent numbers — if you don't have the data, say so
- Tone: warm, intelligent, like a trusted guide`;

      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: 'user', content: question }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'AI service unavailable. Please try again.');
      }

      const data = await response.json();
      const answer = data.content?.[0]?.text || '';

      // Increment free question counter (only for free tier)
      if (req.user.tier === 'free') {
        await incrementFreeQuestions(req.user.mobile);
      }

      ok(res, {
        answer,
        question,
        questionsUsed: req.user.tier === 'free' ? req.user.freeQuestionsUsed + 1 : null,
        questionsRemaining: req.user.tier === 'free' ? Math.max(0, 2 - req.user.freeQuestionsUsed - 1) : null,
      });
    } catch (e) {
      err(res, e.message, 500);
    }
  }
);

module.exports = router;

