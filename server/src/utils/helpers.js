const crypto = require('crypto');
class AppError extends Error { constructor(message, status = 400, code) { super(message); this.status = status; this.code = code; } }
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pageOpts = (q, def = 25, max = 200) => {
  const limit = Math.min(max, Math.max(1, parseInt(q.limit, 10) || def));
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  return { page, limit, skip: (page - 1) * limit };
};
const pagination = (p, total) => ({ page: p.page, limit: p.limit, total, pages: Math.ceil(total / p.limit) });
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');
const safeEqual = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const same = (a, b) => a != null && b != null && String(a._id ?? a) === String(b._id ?? b);
module.exports = { AppError, escapeRegex, pageOpts, pagination, sha256, randomToken, safeEqual, same };
