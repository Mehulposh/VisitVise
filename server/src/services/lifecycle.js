// Automatic visit lifecycle (run every few minutes by jobs/scheduler.js):
//  pending walk-ins time out -> expected visits whose window ended become no_show -> checked-in visitors past the end raise an
//  overstay alert and are checked out automatically after the grace period -> old personal data is anonymised (retention).
const { Site, Visit } = require('../models');
const P = require('../utils/pure');
const emails = require('../utils/emails');
const { notifyHost, notifyStaff } = require('./notify');
const { publishVisit, checkoutVisit, anonymise } = require('./visits');
const log = (e) => console.error(e.message);
const WALKIN_TIMEOUT_MIN = 15;

async function sweep() {
  const out = { noShow: 0, overstay: 0, autoCheckout: 0, approvalsExpired: 0, anonymised: 0 };
  for (const site of await Site.find({ isActive: { $ne: false } }).lean()) {
    const now = P.localParts(new Date(), site.timezone);
    const open = await Visit.find({ siteId: site._id, status: { $in: ['expected', 'checked_in', 'pending_approval'] }, date: { $lte: now.date } }).limit(1000);
    for (const v of open) {
      const mins = P.minutesAfterEnd(v, now);
      if (v.status === 'pending_approval') {
        if (Date.now() - v.created.getTime() > WALKIN_TIMEOUT_MIN * 60000 || mins > 0) {
          v.status = 'denied'; v.approval.reason = 'no response from host'; v.approval.tokenHash = undefined; await v.save();
          if (v.email) emails.walkinResult(v, false, site).catch(log);
          publishVisit('visit.rejected', v, { reason: 'timeout' }); out.approvalsExpired++;
        }
        continue;
      }
      if (mins <= 0) continue;
      if (v.status === 'expected') {
        v.status = 'no_show'; await v.save();
        notifyHost(v, { type: 'no_show', title: `${v.visitorName} did not arrive`, body: `The visit on ${v.date} (${v.from}-${v.to}) was marked as a no-show.`, link: '/' });
        emails.noShow(v).catch(log); publishVisit('visit.no_show', v); out.noShow++;
      } else if (v.status === 'checked_in') {
        if (!v.overstayNotified) {
          v.overstayNotified = true; await v.save();
          const body = `${v.visitorName} is still on site after ${v.to}${v.currentArea ? ` (last seen at ${v.currentArea})` : ''}.`;
          notifyHost(v, { type: 'overstay', title: 'Visitor overstay', body, link: '/', email: true });
          notifyStaff(site._id, { type: 'overstay', title: 'Visitor overstay', body, link: '/gate' });
          publishVisit('visit.overstay', v); out.overstay++;
        }
        if (mins >= (site.graceMinutes ?? 30)) { await checkoutVisit(v, { auto: true }); out.autoCheckout++; }
      }
    }
    if (site.retentionDays > 0) {
      const cutoff = P.addDaysStr(now.date, -site.retentionDays);
      const old = await Visit.find({ siteId: site._id, anonymised: { $ne: true }, status: { $nin: ['expected', 'checked_in', 'pending_approval'] }, date: { $lt: cutoff } }).limit(500);
      for (const v of old) { await anonymise(v); out.anonymised++; }
    }
  }
  return out;
}
module.exports = { sweep };
