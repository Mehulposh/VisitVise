// One-off migration of data written by the OLD server. Safe to re-run:  npm run migrate
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../src/config/env');
const M = require('../src/models');
const { ensureDefaults } = require('../src/services/visits');
const P = require('../src/utils/pure');

(async () => {
  await mongoose.connect(env.mongoUri);
  const site = await ensureDefaults(), today = P.localParts(new Date(), site.timezone).date;
  // 1. users: lowercase emails (report duplicates, never merge), site, flags
  const seen = new Map();
  for (const u of await M.User.find().select('email').lean()) {
    const e = String(u.email).trim().toLowerCase();
    if (seen.has(e)) { console.warn(`DUPLICATE email after lowercasing: ${e} (${seen.get(e)} and ${u._id}) - resolve manually`); continue; }
    seen.set(e, u._id); if (e !== u.email) await M.User.collection.updateOne({ _id: u._id }, { $set: { email: e } });
  }
  await M.User.collection.updateMany({ siteId: { $exists: false } }, { $set: { siteId: site._id } });
  await M.User.collection.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true, emailVerified: true, notifyEmail: true } });
  // 2. visits: site, and move the embedded scan log into its own collection
  await M.Visit.collection.updateMany({ siteId: { $exists: false } }, { $set: { siteId: site._id } });
  let moved = 0;
  for (const v of await M.Visit.collection.find({ scans: { $exists: true, $ne: [] } }).toArray()) {
    const rows = (v.scans || []).map((s) => ({ visitId: v._id, code: v.code, siteId: v.siteId || site._id, visitorName: v.visitorName, area: s.area, mode: 'access', ok: s.ok, reason: s.reason, at: s.at || s.time || v.created || new Date() }));
    if (rows.length) { await M.Scan.insertMany(rows); moved += rows.length; }
    await M.Visit.collection.updateOne({ _id: v._id }, { $unset: { scans: '' } });
  }
  // 3. visits that can never happen any more: past "expected" -> no_show, yesterday's "checked_in" -> checked_out (no emails are sent for old data)
  const ns = await M.Visit.collection.updateMany({ status: 'expected', date: { $lt: today } }, { $set: { status: 'no_show' } });
  const co = await M.Visit.collection.updateMany({ status: 'checked_in', date: { $lt: today } }, [{ $set: { status: 'checked_out', autoCheckout: true, checkOut: { $ifNull: ['$checkOut', '$checkIn'] } } }]);
  // 4. indexes
  for (const m of Object.values(M).filter((x) => x && x.syncIndexes)) { try { await m.syncIndexes(); } catch (e) { console.warn(`Index sync failed for ${m.modelName}: ${e.message}`); } }
  console.log(`Site "${site.name}" (${site.timezone}); moved ${moved} scan record(s); ${ns.modifiedCount} past visit(s) marked no_show; ${co.modifiedCount} stale check-in(s) closed.`);
  // 5. security audit
  const def = await M.User.findOne({ email: 'admin@example.com' }).select('+password');
  if (def && (await bcrypt.compare('Admin@123', def.password))) console.warn('\n!!! SECURITY: admin@example.com still has the OLD DEFAULT PASSWORD (Admin@123). Change it or disable the account NOW.');
  const admins = await M.User.find({ role: 'admin' }).select('name email created').lean();
  console.warn(`\nAdmin accounts to review (${admins.length}):`); admins.forEach((a) => console.warn(`  ${a.name} <${a.email}>`));
  console.warn('\nRotate JWT_SECRET (and SMTP / database passwords that were in the shared zip): tokens issued by the old server stay valid until they expire unless the secret changes.');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
