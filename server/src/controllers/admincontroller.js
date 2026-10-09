const Visit = require('../models/Visit');
const User = require('../models/User');
const mail = require('../utils/emails');
const { passView } = require('./visitcontroller');
const today = () => new Date().toLocaleDateString('en-CA');
const now = () => new Date().toTimeString().slice(0, 5);

exports.data = async (req, res) => {
  const [visits, users] = await Promise.all([Visit.find().sort({ created: -1 }), User.find().sort({ created: 1 })]);
  res.json({ today: today(), visits, users });
};
// Security gate: verify a pass for a given area
exports.scan = async (req, res) => {
  const { area } = req.body, code = (req.body.code || '').toUpperCase();
  const v = await Visit.findOne({ code });
  if (!v) return res.json({ ok: false, reason: 'Unknown pass' });
  const result = async (ok, reason) => {
    v.scans.push({ at: new Date(), area, ok, reason });
    if (!ok) mail.accessDenied(v, area, reason);
    await v.save();
    res.json({ ok, reason, visit: passView(v) });
  };
  if (v.status === 'cancelled') return result(false, 'Pass cancelled');
  if (v.status === 'checked_out') return result(false, 'Visitor already checked out');
  if (v.date !== today()) return result(false, 'Pass not valid today');
  if (now() < v.from || now() > v.to) return result(false, `Outside allowed time (${v.from}-${v.to})`);
  if (!v.areas.includes(area)) return result(false, `No access to ${area}`);
  if (v.status === 'expected') { v.status = 'checked_in'; v.checkIn = new Date(); mail.visitorArrived(v); }
  result(true, 'Access granted');
};