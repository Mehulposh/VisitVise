const User = require('../models/User');
const { sign } = require('../middleware/auth');
const { AREAS } = require('../utils/constants');
const today = () => new Date().toLocaleDateString('en-CA');
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 6)
    return res.status(400).json({ error: 'Name, valid email and password (6+ chars) required' });
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ name, email, password });
  res.json({ token: sign(user), user });
};


exports.login = async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await user.matches(req.body.password || ''))) return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(user), user });
};
exports.me = (req, res) => res.json({ user: req.user, areas: AREAS, today: today() });