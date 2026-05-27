'use strict';

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');

const routes        = require('./src/routes/index');
const authRoutes    = require('./src/routes/auth');
const razorpayRoutes = require('./src/routes/razorpay');
const stripeRoutes  = require('./src/routes/stripe');
const { checkConnection } = require('./src/services/db');

const app  = express();
const PORT = process.env.PORT || 8080;

// ─── SECURITY ─────────────────────────────────────────────────────────
app.use(helmet());
app.disable('x-powered-by');

// ─── CORS ─────────────────────────────────────────────────────────────
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:3000,http://localhost:5500,https://thenumerastra.com'
)
.split(',')
.map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Internal-Secret'],
}));

// ─── WEBHOOK ROUTES (raw body — MUST be before express.json()) ────────
// Stripe and Razorpay verify signatures against the raw request body.
// These routes handle their own body parsing internally.
app.use('/api/payments/razorpay/webhook', razorpayRoutes);
app.use('/api/payments/stripe/webhook',   stripeRoutes);

// ─── COMPRESSION & PARSING ────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// ─── LOGGING ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── RATE LIMITING ────────────────────────────────────────────────────
// Global limiter
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please slow down.' },
});
app.use(globalLimiter);

// Stricter limiter for calculation endpoints (AI-heavy)
const calcLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, error: 'Calculation rate limit reached. Max 20/minute.' },
});
app.use('/api/calculate', calcLimiter);
app.use('/api/astro', calcLimiter);
app.use('/api/auspicious/find', calcLimiter);

// ─── ROUTES ───────────────────────────────────────────────────────────
app.use('/api/auth',               authRoutes);
app.use('/api/payments/razorpay',  razorpayRoutes);
app.use('/api/payments/stripe',    stripeRoutes);
app.use('/api',                    routes);

// ─── DB HEALTH CHECK ──────────────────────────────────────────────────
app.get('/api/health/db', async (req, res) => {
  try {
    const ts = await checkConnection();
    res.json({ db: 'connected', serverTime: ts });
  } catch (e) {
    res.status(503).json({ db: 'error', error: e.message });
  }
});

// Also add PATCH to CORS allowed methods


// Root — API index
app.get('/', (req, res) => {
  res.json({
    name: 'Numerology Platform API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/health',
    endpoints: {
      calculate:   'POST /api/calculate',
      systems:     ['POST /api/calculate/pythagorean', 'POST /api/calculate/chaldean', 'POST /api/calculate/vedic'],
      biorhythm:   'POST /api/calculate/biorhythm',
      loshu:       'POST /api/calculate/loshu',
      remedyName:  'POST /api/remedy/name',
      remedyNum:   'POST /api/remedy/number',
      compat:      'POST /api/compatibility',
      universal:   'GET  /api/universal',
      angel:       'GET  /api/angel/:number',
      astro:       'POST /api/astro',
      auspicious:  'POST /api/auspicious/find',
      cheiro:      'GET  /api/cheiro/:number',
      reduce:      'POST /api/reduce',
      reference:   ['GET /api/reference/planets', 'GET /api/reference/lucky/:number'],
    },
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────
app.use((error, req, res, _next) => {
  console.error('[API Error]', error.message);
  const status = error.status || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
});

// ─── START ────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
