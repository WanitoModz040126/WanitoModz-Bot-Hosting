const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Locked-down security headers. CSP is intentionally strict: only same-origin
// scripts/styles plus the Google Fonts + Cloudflare Turnstile hosts we use.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ['https://challenges.cloudflare.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Global ceiling: blunts generic floods / scraping across the whole app.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

// Tight limiter for auth routes specifically - the most common brute-force /
// credential-stuffing / signup-spam target.
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a minute before trying again.' },
});

// Stricter limiter for anything that touches disk (uploads, file/folder ops,
// bot start/stop) - the routes that are most expensive to abuse.
const heavyActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many actions in a short time. Please slow down.' },
});

module.exports = { helmetMiddleware, globalLimiter, authLimiter, heavyActionLimiter };
