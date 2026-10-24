const env = require('../config/env');
const { Site, Area, Visit, Blocklist, User } = require('../models');
const P = require('../utils/pure');
const emails = require('../utils/emails');
const { sendMessage } = require('../utils/sms');
const { AppError, same, sha256, randomToken } = require('../utils/helpers');
const { publish } = require('./events');
const { emitWebhook } = require('./webhooks');
const { notifyHost, notifyStaff } = require('./notify');
const { removeFile } = require('../middleware/upload');

const log = (e) => console.error(e.message);
const DEFAULT_AREAS = [['Lobby', false], ['Office Floor', false], ['Meeting Rooms', false], ['Cafeteria', false], ['Lab', false], ['Parking', false], ['Server Room', true]];

async function ensureDefaults() {
  let site = await Site.findOne().sort({ created: 1 });
  if (!site) site = await Site.create({ name: 'Main Office', code: 'MAIN', timezone: env.timezone });
  if (!(await Area.exists({ siteId: site._id }))) await Area.insertMany(DEFAULT_AREAS.map(([name, requiresApproval]) => ({ siteId: site._id, name, requiresApproval })));
  return site;
}
const defaultSite = async () => (await Site.findOne({ isActive: { $ne: false } }).sort({ created: 1 })) || ensureDefaults();
async function siteOf(userOrId) {
  const id = userOrId?.siteId || userOrId;
  const s = id && /^[a-f\d]{24}$/i.test(String(id)) ? await Site.findById(id) : null;
  return s || defaultSite();
}
const nowFor = (site) => P.localParts(new Date(), site.timezone);
const norm = (p) => String(p || '').replace(/\D/g, '').slice(-10);

/** Blocklist match: same email, same phone, or (for entries that have neither) same full name. */
async function isBlocked({ visitorName, email, phone }) {
  const list = await Blocklist.find({ active: true }).limit(5000).lean();
  const em = String(email || '').toLowerCase(), ph = norm(phone), nm = String(visitorName || '').trim().toLowerCase();
  return list.find((b) => (b.email && b.email === em) || (b.phone && norm(b.phone) === ph && ph) || (!b.email && !b.phone && b.name && b.name === nm)) || null;
}

/** Throws a 400 with a clear message when the requested pass breaks the site policy. Admins may bypass opening hours. */
async function validateInput(input, site, user) {
  const now = nowFor(site), end = input.endDate || input.date;
  if (input.date < now.date) throw new AppError('The visit date cannot be in the past', 400);
  if (end < input.date) throw new AppError('End date cannot be before the start date', 400);
  if (P.utcMs(end) - P.utcMs(input.date) > 30 * 864e5) throw new AppError('A pass can span at most 31 days', 400);
  if (input.from === input.to) throw new AppError('Start and end time must be different', 400);
  if (!input.walkIn && input.date === now.date && input.from <= input.to && input.to < now.time) throw new AppError('That time window has already ended today', 400);
  if (user?.role !== 'admin') {
    for (let d = input.date, i = 0; d <= end && i < 31; d = P.addDaysStr(d, 1), i++) { const r = P.closedReason(site, d); if (r) throw new AppError(r, 400, 'SITE_CLOSED'); }
    const h = input.walkIn ? null : P.hoursReason(site, input.from, input.to); // walk-ins and deliveries happen when they happen
    if (h) throw new AppError(h, 400, 'OUTSIDE_HOURS');
  }
  const areas = await Area.find({ siteId: site._id, active: { $ne: false } }).lean(), byName = Object.fromEntries(areas.map((a) => [a.name, a]));
  if (!input.areas?.length) throw new AppError('Select at least one area', 400);
  for (const a of input.areas) if (!byName[a]) throw new AppError(`Unknown area: ${a}`, 400);
  return { restricted: input.areas.filter((a) => byName[a].requiresApproval) };
}

const publishVisit = (type, v, extra = {}) => {
  const data = { type, visitId: String(v._id), visitorName: v.visitorName, status: v.status, hostId: String(v.hostId), siteId: String(v.siteId), ...extra };
  publish(data); emitWebhook(v.siteId, type, data);
};
async function deliverPass(v, site) {
  if (v.status !== 'expected') return;
  const via = v.notifyVia?.length ? v.notifyVia : ['email'];
  if (v.email && via.includes('email')) emails.visitScheduled(v, site).catch(log);
  if (v.phone) for (const ch of ['sms', 'whatsapp']) if (via.includes(ch)) sendMessage(ch, v.phone, `Hi ${v.visitorName}, your visit pass for ${emails.when(v)} (host ${v.hostName}): ${emails.link(v.code)}`);
}

/** Creates one visit (retrying on the rare pass-code collision). `extra` may carry status, groupId, seriesId, walkIn, approval. */
async function createVisit({ host, site, input, extra = {} }) {
  if (await isBlocked(input)) throw new AppError('This visitor cannot be registered. Please contact security.', 403, 'BLOCKED');
  const { restricted } = await validateInput({ ...input, walkIn: extra.walkIn }, site, host);
  const base = { hostId: host._id, hostName: host.name, hostEmail: host.email, siteId: site._id, visitorName: input.visitorName, company: input.company || '', email: input.email || '', phone: input.phone || '',
    purpose: input.purpose || 'Meeting', date: input.date, endDate: input.endDate && input.endDate !== input.date ? input.endDate : undefined, from: input.from, to: input.to, areas: input.areas,
    approvedAreas: host.role === 'admin' ? restricted : [], notes: input.notes || '', vehicle: input.vehicle, notifyVia: input.notifyVia, ...extra };
  let v;
  for (let i = 0; i < 6 && !v; i++) {
    try { v = await Visit.create({ ...base, code: P.genCode(10) }); } catch (e) { if (!(e.code === 11000 && e.keyPattern?.code)) throw e; }
  }
  if (!v) throw new AppError('Could not generate a pass code, please retry', 500);
  publishVisit('visit.created', v);
  if (restricted.length && host.role !== 'admin') notifyStaff(site._id, { type: 'approval_needed', title: 'Restricted-area approval needed', body: `${host.name} registered ${v.visitorName} for ${restricted.join(', ')}.`, link: `/admin/visits/${v._id}`, email: true }, ['admin']);
  deliverPass(v, site);
  return v;
}

async function canManage(user, v) {
  return user.role === 'admin' || same(user._id, v.hostId) || !!(await User.exists({ _id: v.hostId, delegateId: user._id }));
}
async function hostIdsFor(user) { return [user._id, ...(await User.find({ delegateId: user._id }).select('_id').lean()).map((u) => u._id)]; }

/** Host (or delegate / admin / emailed token) approves or denies a walk-in who is waiting at reception. */
async function decideVisit(v, decision, by, areas) {
  if (v.status !== 'pending_approval') throw new AppError('This request was already handled', 409);
  const site = await siteOf(v.siteId);
  v.approval = { ...(v.approval?.toObject?.() || {}), decidedBy: by?._id, decidedAt: new Date(), tokenHash: undefined };
  if (decision === 'deny') { v.status = 'denied'; v.approval.reason = 'denied by host'; }
  else {
    if (areas?.length) {
      const known = await Area.find({ siteId: site._id, active: { $ne: false }, name: { $in: areas } }).lean();
      if (known.length !== areas.length) throw new AppError('Unknown area in the approval', 400);
      v.areas = areas;
    }
    v.status = 'expected'; v.approval.reason = 'approved';
    const sensitive = await Area.find({ siteId: site._id, name: { $in: v.areas }, requiresApproval: true }).lean();
    v.approvedAreas = by?.role === 'admin' ? sensitive.map((a) => a.name) : []; // only an admin can open sensitive areas
  }
  await v.save();
  publishVisit(decision === 'deny' ? 'visit.rejected' : 'visit.approved', v);
  if (v.email) emails.walkinResult(v, decision !== 'deny', site).catch(log);
  return v;
}

async function checkoutVisit(v, { auto = false } = {}) {
  v.status = 'checked_out'; v.checkOut = new Date(); v.autoCheckout = auto; v.currentArea = undefined;
  if (v.idDoc?.filename) { await removeFile('ids', v.idDoc.filename); v.idDoc = undefined; } // ID images are not kept after the visit
  await v.save();
  publishVisit('visit.checked_out', v, { auto });
  return v;
}

/** Wipes personal data but keeps the visit row (counts, dates and scans) for statistics. */
async function anonymise(v) {
  await Promise.all([removeFile('ids', v.idDoc?.filename), removeFile('photos', v.photo?.filename)]);
  Object.assign(v, { visitorName: 'Anonymised visitor', company: '', email: '', phone: '', notes: '', anonymised: true, photo: undefined, idDoc: undefined, vehicle: undefined, notifyVia: [] });
  if (v.agreement) v.agreement.name = ''; if (v.declaration) v.declaration.answers = undefined;
  if (['expected', 'pending_approval'].includes(v.status)) v.status = 'cancelled';
  await v.save();
  return v;
}

const newApprovalToken = () => { const token = randomToken(); return { token, tokenHash: sha256(token) }; };
module.exports = { ensureDefaults, defaultSite, siteOf, nowFor, isBlocked, validateInput, createVisit, deliverPass, publishVisit, canManage, hostIdsFor, decideVisit, checkoutVisit, anonymise, newApprovalToken, DEFAULT_AREAS };
