const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const { AppError } = require('../utils/helpers');

const COOKIE = 'vv_token';
const sign = (u) => jwt.sign({ id: String(u._id) }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpires });
const cookieOpts = () => ({ httpOnly: true, secure: env.isProd, sameSite: env.cookieSameSite, path: '/' });
const setCookie = (res, token) => res.cookie(COOKIE, token, { ...cookieOpts(), maxAge: 24 * 3600 * 1000 });
const clearCookie = (res) => res.clearCookie(COOKIE, cookieOpts());

async function load(req) {
  const h = req.get('authorization');
  const token = req.cookies?.[COOKIE] || (h && h.startsWith('Bearer ') ? h.slice(7) : null); // Bearer kept for the old client
  if (!token) throw new AppError('Not authenticated', 401);
  let d;
  try { d = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }); } // old tokens signed with other settings are rejected
  catch (e) { throw new AppError(e.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token', 401); }
  const user = await User.findById(d.id);
  if (!user) throw new AppError('Account not found', 401);
  if (user.isActive === false) throw new AppError('This account has been disabled', 403);
  if (user.passwordChangedAt && d.iat * 1000 < user.passwordChangedAt.getTime()) throw new AppError('Password was changed, please log in again', 401);
  return user;
}
const authenticate = async (req, res, next) => { req.user = await load(req); next(); };
const optionalAuth = async (req, res, next) => { try { req.user = await load(req); } catch { /* anonymous */ } next(); };
const requireRole = (...roles) => (req, res, next) => (roles.includes(req.user?.role) ? next() : next(new AppError('You do not have permission to do this', 403)));
module.exports = { COOKIE, sign, setCookie, clearCookie, authenticate, optionalAuth, requireRole, staffOnly: requireRole('security', 'admin'), adminOnly: requireRole('admin') };
