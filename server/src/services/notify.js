const { User, Notification } = require('../models');
const { send } = require('../utils/mailer');
const { escapeHtml } = require('../utils/pure');

/** In-app notification (+ optional email). Never throws. */
async function notifyUser(userId, { type, title, body, link, email = false }) {
  try {
    const u = await User.findById(userId).select('email notifyEmail isActive');
    if (!u || u.isActive === false) return;
    await Notification.create({ userId, type, title, body, link });
    if (email && u.notifyEmail !== false) send(u.email, title, `<p>${escapeHtml(body)}</p>`).catch((e) => console.error('mail failed:', e.message));
  } catch (e) { console.error('notify failed:', e.message); }
}
/** The host and their delegate (colleague covering for them). */
async function notifyHost(visit, payload) {
  const host = await User.findById(visit.hostId).select('delegateId').lean();
  return Promise.all([visit.hostId, host?.delegateId].filter(Boolean).map((id) => notifyUser(id, payload)));
}
/** Security staff of the site, plus admins. */
async function notifyStaff(siteId, payload, roles = ['security', 'admin']) {
  const staff = await User.find({ role: { $in: roles }, isActive: { $ne: false }, $or: [{ siteId }, { siteId: null }, { siteId: { $exists: false } }] }).select('_id').limit(200).lean();
  return Promise.all(staff.map((s) => notifyUser(s._id, payload)));
}
module.exports = { notifyUser, notifyHost, notifyStaff };
