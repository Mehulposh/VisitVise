const crypto = require('crypto');
const Visit = require('../models/Visit');
const mail = require('../utils/emails');
const { AREAS } = require('../utils/constants');
const today = () => new Date().toLocaleDateString('en-CA');
const genCode = () => Array.from(crypto.randomBytes(8), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const passView = v => ({ code: v.code, visitorName: v.visitorName, company: v.company, host: v.hostName, purpose: v.purpose, date: v.date, from: v.from, to: v.to, areas: v.areas, status: v.status });
exports.passView = passView;

exports.create = async (req, res) => {
  const { visitorName, company, email, phone, purpose, date, from, to, areas } = req.body;
  if (!visitorName || !date || !from || !to) return res.status(400).json({ error: 'Visitor name, date and time window are required' });
  if (date < today()) return res.status(400).json({ error: 'Date cannot be in the past' });
  if (to <= from) return res.status(400).json({ error: 'End time must be after start time' });
  if (!Array.isArray(areas) || !areas.length || areas.some(a => !AREAS.includes(a))) return res.status(400).json({ error: 'Select at least one valid area' });
  const v = await Visit.create({ hostId: req.user._id, hostName: req.user.name, hostEmail: req.user.email, visitorName, company, email, phone, purpose, date, from, to, areas, code: genCode() });
  mail.visitScheduled(v);
  res.json(v);
};
exports.mine = async (req, res) => res.json(await Visit.find({ hostId: req.user._id }).sort({ created: -1 }));
exports.update = async (req, res) => {
  const v = await Visit.findById(req.params.id).catch(() => null);
  if (!v || (String(v.hostId) !== String(req.user._id) && req.user.role !== 'admin')) return res.status(404).json({ error: 'Not found' });
  const { status, areas } = req.body;
  if (status === 'cancelled' && v.status === 'expected') { v.status = 'cancelled'; mail.visitCancelled(v); }
  else if (status === 'checked_out' && req.user.role === 'admin' && v.status === 'checked_in') v.status = 'checked_out';
  if (Array.isArray(areas) && areas.length && areas.every(a => AREAS.includes(a)) && v.status === 'expected') v.areas = areas;
  await v.save();
  res.json(v);
};
// Public: a visitor looks up their own pass with the code
exports.pass = async (req, res) => {
  const v = await Visit.findOne({ code: req.params.code.toUpperCase() });
  v ? res.json(passView(v)) : res.status(404).json({ error: 'Pass not found' });
};