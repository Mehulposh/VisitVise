const jwt = require('jsonwebtoken');
const User = require('../models/User');
exports.wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
exports.auth = exports.wrap(async (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    const { id } = jwt.verify(t, process.env.JWT_SECRET);
    req.user = await User.findById(id);
  } catch { req.user = null; }
  if (!req.user) return res.status(401).json({ error: 'Please log in' });
  next();
});
exports.adminOnly = (req, res, next) =>  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' });
exports.sign = u => jwt.sign({ id: u.id }, process.env.JWT_SECRET, { expiresIn: '1d' });