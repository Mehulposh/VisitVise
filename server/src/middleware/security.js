const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { AppError, safeEqual } = require('../utils/helpers');

const limiter = (windowMs, limit, msg) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: msg, message: msg } });
const clean = (o) => { // NoSQL-injection guard
  if (Array.isArray(o)) return o.forEach(clean);
  if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (k.startsWith('$') || k.includes('.')) delete o[k]; else clean(o[k]); }
};
// Walk-in kiosks are public by nature; an optional device key keeps strangers from spamming hosts.
const kioskGuard = (req, res, next) => (!env.kioskKey || safeEqual(req.get('x-kiosk-key') || '', env.kioskKey) ? next() : next(new AppError('Kiosk not authorised', 403)));

module.exports = {
  sanitize: (req, res, next) => { clean(req.body); clean(req.params); next(); },
  kioskGuard,
  globalLimiter: limiter(15 * 60 * 1000, 1500, 'Too many requests, please try again later.'),
  authLimiter: limiter(15 * 60 * 1000, 20, 'Too many attempts, please try again in a few minutes.'),
  passLimiter: limiter(15 * 60 * 1000, 80, 'Too many pass lookups, please slow down.'),       // stops pass-code guessing
  walkinLimiter: limiter(15 * 60 * 1000, 20, 'Too many walk-in requests from this device.'),
  writeLimiter: limiter(60 * 1000, 60, 'You are doing that too quickly.'),
  gateLimiter: limiter(60 * 1000, 300, 'Too many scans per minute.'),
};
