const { Visit, Area, Scan, User } = require('../models');
const P = require('../utils/pure');
const emails = require('../utils/emails');
const { AppError, same } = require('../utils/helpers');
const { siteOf, nowFor, isBlocked, publishVisit, checkoutVisit, createVisit } = require('./visits');
const { notifyHost, notifyStaff } = require('./notify');

const log = (e) => console.error(e.message);
const deny = (reason) => ({ ok: false, reason });

async function doAccess(v, area, by) {
  if (v.anonymised) return deny('Pass is no longer valid');
  if (v.status === 'pending_approval') return deny('Waiting for host approval');
  if (v.status === 'denied') return deny('This visit was not approved');
  if (v.status === 'cancelled') return deny('Visit was cancelled');
  if (v.status === 'no_show') return deny('Pass expired');
  if (v.status === 'checked_out') return deny('Visitor already checked out');
  if (by.role === 'security' && by.siteId && !same(by.siteId, v.siteId)) return deny('Pass belongs to another site');
  if (await isBlocked(v)) return deny('Visitor is on the blocklist');
  const site = await siteOf(v.siteId), now = nowFor(site);
  const w = P.windowState(v, now); if (!w.ok) return deny(w.reason);
  if (by.role !== 'admin' && P.closedReason(site, now.date)) return deny('Facility is closed today');
  if (!area) return deny('Select the area being entered');
  if (!v.areas.includes(area)) return deny(`Not allowed in ${area}`);
  const a = await Area.findOne({ siteId: v.siteId, name: area }).lean();
  if (!a || a.active === false) return deny('Area is not available');
  if (a.requiresApproval && !v.approvedAreas.includes(area)) return deny(`${area} needs admin approval`);
  if (site.requireAgreement && !(v.agreement?.accepted && v.agreement.version === site.agreementVersion)) return deny('Visitor has not accepted the site agreement');
  if (site.requireHealthDeclaration) {
    if (!v.declaration?.at) return deny('Health declaration is missing');
    if (v.declaration.flagged) return deny('Health declaration needs review by security');
  }
  if (a.capacity > 0 && (await Visit.countDocuments({ siteId: v.siteId, status: 'checked_in', currentArea: area, _id: { $ne: v._id } })) >= a.capacity) return deny(`${area} is at capacity`);
  const first = v.status === 'expected';
  if (first) { v.status = 'checked_in'; v.checkIn = new Date(); }
  v.currentArea = area; await v.save();
  return { ok: true, reason: first ? 'Checked in' : 'Access granted', firstEntry: first };
}

/** One entry point for every scan: access (default) or checkout. Always writes a Scan row and notifies on refusals. */
async function scan({ code, area, mode = 'access', by }) {
  const base = { code, area, mode, by: by._id, byName: by.name };
  const v = code ? await Visit.findOne({ code }) : null;
  if (!v) { await Scan.create({ ...base, ok: false, reason: 'Unknown pass' }); return { ...deny('Unknown pass'), visit: null }; }
  let r;
  if (mode === 'checkout') r = v.status === 'checked_in' ? (await checkoutVisit(v), { ok: true, reason: 'Checked out' }) : deny('Visitor is not checked in');
  else r = await doAccess(v, area, by);
  await Scan.create({ ...base, visitId: v._id, siteId: v.siteId, visitorName: v.visitorName, ok: r.ok, reason: r.reason });
  if (mode === 'access') {
    if (r.ok && r.firstEntry) {
      publishVisit('visit.checked_in', v, { area });
      notifyHost(v, { type: 'arrived', title: `${v.visitorName} has arrived`, body: `${v.visitorName} checked in at ${area}.`, link: '/' });
      emails.visitorArrived(v).catch(log);
    } else if (!r.ok) {
      publishVisit('visit.denied', v, { area, reason: r.reason });
      notifyHost(v, { type: 'denied', title: `Access refused for ${v.visitorName}`, body: `${area || 'Gate'}: ${r.reason}`, link: '/' });
      emails.accessDenied(v, area, r.reason).catch(log);
      if (/blocklist|declaration/i.test(r.reason)) notifyStaff(v.siteId, { type: 'security_alert', title: 'Security alert', body: `${v.visitorName}: ${r.reason}`, link: '/gate' });
    }
  }
  return { ok: r.ok, reason: r.reason, checkedIn: !!r.firstEntry, visit: v.toJSON() };
}

/** Courier / delivery fast lane: no pre-registration, straight in for one hour. */
async function deliveryEntry({ by, courier, company, hostId, note }) {
  const site = await siteOf(by), now = nowFor(site), end = P.addMinutesLocal(now.date, now.time, 60);
  const host = (hostId && (await User.findOne({ _id: hostId, isActive: { $ne: false } }))) || by;
  const lobby = (await Area.findOne({ siteId: site._id, name: 'Lobby', active: { $ne: false } })) || (await Area.findOne({ siteId: site._id, active: { $ne: false }, requiresApproval: false }));
  if (!lobby) throw new AppError('No public area is configured for deliveries', 409);
  const v = await createVisit({ host, site, extra: { status: 'checked_in', checkIn: new Date(), currentArea: lobby.name, walkIn: true },
    input: { visitorName: courier, company: company || '', purpose: 'Delivery', date: now.date, from: now.time, to: end.time, areas: [lobby.name], notes: note || '' } });
  await Scan.create({ visitId: v._id, code: v.code, siteId: site._id, area: lobby.name, mode: 'delivery', ok: true, reason: 'Delivery logged', by: by._id, byName: by.name, visitorName: courier });
  publishVisit('visit.checked_in', v, { area: lobby.name });
  notifyHost(v, { type: 'delivery', title: 'A delivery has arrived', body: `${courier}${company ? ` (${company})` : ''} is at ${lobby.name}.${note ? ' ' + note : ''}`, link: '/', email: true });
  return v;
}
module.exports = { scan, deliveryEntry };
