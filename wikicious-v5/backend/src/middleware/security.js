'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Security Middleware
 *  Fixes: open CORS, weak rate limits, SQL injection, input sanitisation,
 *  suspicious activity detection, request fingerprinting
 * ════════════════════════════════════════════════════════════════
 */
const rateLimit = require('express-rate-limit');

// ── CORS ──────────────────────────────────────────────────────────────────
// Replace cors({ origin: '*' }) with explicit allow-list
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)
  .concat([
    'https://app.wikicious.io',
    'https://www.wikicious.io',
    'https://wikicious.io',
    process.env.NODE_ENV !== 'production' && 'http://localhost:3000',
    process.env.NODE_ENV !== 'production' && 'http://localhost:5173',
  ].filter(Boolean));

const corsOptions = {
  origin: (origin, cb) => {
    // Allow no-origin (curl, mobile apps, Postman in dev)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400, // cache preflight 24h
};

// ── RATE LIMITS ───────────────────────────────────────────────────────────
// Auth endpoints — very tight
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                      // 10 attempts per 15 min
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.ip + (req.body?.email || ''),
});

// Write endpoints (orders, deposits, withdrawals)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 30,
  message: { error: 'Too many requests. Slow down.' },
  standardHeaders: true,
});

// Read endpoints (prices, markets)
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true,
});

// Global catch-all (replace max:500)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,  // down from 500
  standardHeaders: true,
  skip: req => req.ip === '127.0.0.1', // skip localhost health checks
});

// ── INPUT VALIDATION ──────────────────────────────────────────────────────

// Ethereum address validator
function isValidAddress(addr) {
  return typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr);
}

// Bytes32 hex validator
function isValidBytes32(h) {
  return typeof h === 'string' && /^0x[0-9a-fA-F]{64}$/.test(h);
}

// Safe integer validator
function isSafeUint(v, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= max;
}

// SQL injection: sanitise the `interval` parameter used in candle queries
const SAFE_INTERVALS = new Set(['1m','5m','15m','30m','1h','4h','1d','1w']);
function sanitiseInterval(interval) {
  const s = String(interval || '1h');
  if (!SAFE_INTERVALS.has(s)) return '1h';  // default safe
  return s;
}

// Strip any SQL meta-characters from symbol
function sanitiseSymbol(sym) {
  return String(sym || '').replace(/[^A-Z0-9]/g, '').slice(0, 20);
}

// ── REQUEST VALIDATION MIDDLEWARES ───────────────────────────────────────

/**
 * Validate :address route param
 */
function requireAddress(req, res, next) {
  const addr = req.params.address || req.body?.address;
  if (!isValidAddress(addr)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }
  // Normalise to lowercase
  if (req.params.address) req.params.address = addr.toLowerCase();
  next();
}

/**
 * Validate :symbol route param — must be uppercase alphanumeric
 */
function requireSymbol(req, res, next) {
  const sym = sanitiseSymbol(req.params.symbol);
  if (!sym) return res.status(400).json({ error: 'Invalid symbol' });
  req.params.symbol = sym;
  next();
}

/**
 * Sanitise candle query params
 */
function sanitiseCandles(req, res, next) {
  req.query.interval = sanitiseInterval(req.query.interval);
  req.query.limit    = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 200));
  next();
}

/**
 * Sanitise orderbook query params
 */
function sanitiseOrderbook(req, res, next) {
  req.query.depth = Math.min(100, Math.max(1, parseInt(req.query.depth) || 25));
  next();
}

// ── SUSPICIOUS ACTIVITY DETECTION ────────────────────────────────────────

const suspiciousPatterns = [
  /(\bSELECT\b|\bUNION\b|\bDROP\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b)/i,  // SQL
  /<script[\s>]/i,         // XSS
  /\.\.[\/\\]/,            // path traversal
  /\${.*}/,                // template injection
  /0x[0-9a-f]{100,}/i,    // suspiciously long hex (potential overflow)
];

function detectSuspicious(req, res, next) {
  const toCheck = [
    JSON.stringify(req.body || {}),
    JSON.stringify(req.query || {}),
    JSON.stringify(req.params || {}),
  ].join('|');

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(toCheck)) {
      console.warn(`[SECURITY] Suspicious request from ${req.ip}: ${req.method} ${req.path}`);
      return res.status(400).json({ error: 'Invalid request' });
    }
  }
  next();
}

// ── REQUEST ID ────────────────────────────────────────────────────────────

function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || `wik-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
}

// ── SECURITY HEADERS (supplement helmet) ─────────────────────────────────

function extraSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

// ── JWT SECRET VALIDATION ─────────────────────────────────────────────────

function validateJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'wikicious-secret-change-me') {
    console.error('\n[SECURITY FATAL] JWT_SECRET is not set or is the default value.');
    console.error('Set a strong random secret: openssl rand -base64 64\n');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // refuse to start in production with default secret
    }
    console.warn('[SECURITY WARNING] Using insecure default JWT secret in development');
  }
  if (secret && secret.length < 32) {
    console.error('[SECURITY] JWT_SECRET is too short. Use at least 64 random characters.');
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
}

// ── KEEPER KEY SECURITY CHECK ─────────────────────────────────────────────

function validateKeeperKey() {
  if (!process.env.KEEPER_PRIVATE_KEY) {
    console.warn('[SECURITY] KEEPER_PRIVATE_KEY not set — keeper features disabled');
    return;
  }
  const key = process.env.KEEPER_PRIVATE_KEY;
  if (key.startsWith('0x') && key.length === 66) {
    // Valid format — but warn about hot wallet risk
    console.warn('[SECURITY] Keeper is using a hot wallet private key.');
    console.warn('           Production: use a hardware wallet or KMS for keeper signing.');
  }
}

// ── ADMIN ROUTE PROTECTION ────────────────────────────────────────────────

/**
 * Middleware that blocks access to /api/admin/* from non-internal IPs
 * unless the admin API key header is present.
 */
function adminGuard(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    console.warn('[SECURITY] ADMIN_API_KEY not set — admin endpoints disabled');
    return res.status(503).json({ error: 'Admin not configured' });
  }

  if (!adminKey || adminKey !== expectedKey) {
    console.warn(`[SECURITY] Admin access denied from ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ── EXPORTS ───────────────────────────────────────────────────────────────

module.exports = {
  corsOptions,
  authLimiter,
  writeLimiter,
  readLimiter,
  globalLimiter,
  requireAddress,
  requireSymbol,
  sanitiseCandles,
  sanitiseOrderbook,
  detectSuspicious,
  requestId,
  extraSecurityHeaders,
  adminGuard,
  validateJwtSecret,
  validateKeeperKey,
  // helpers exported for tests
  isValidAddress,
  isValidBytes32,
  isSafeUint,
  sanitiseInterval,
  sanitiseSymbol,
};
