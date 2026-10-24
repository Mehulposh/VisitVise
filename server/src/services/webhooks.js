const crypto = require('crypto');
const dns = require('dns').promises;
const { Webhook } = require('../models');
const { isPrivateIp } = require('../utils/pure');
const { AppError } = require('../utils/helpers');

/** Only public https endpoints: blocks http, localhost, private ranges and cloud metadata addresses (SSRF). */
async function assertSafeUrl(raw) {
  let u; try { u = new URL(raw); } catch { throw new AppError('Invalid webhook URL', 400); }
  if (u.protocol !== 'https:') throw new AppError('Webhook URL must use https', 400);
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new AppError('Webhook URL must point to a public host', 400);
  return u;
}
async function deliver(hook, event, data) {
  const at = new Date().toISOString(), text = `[VisitVise] ${event}: ${data.visitorName || ''} ${data.area ? '@ ' + data.area : ''} ${data.reason || ''}`.trim();
  const body = JSON.stringify(hook.format === 'slack' ? { text } : { event, data, at });
  const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await assertSafeUrl(hook.url); // re-checked on every call (DNS can change)
      const r = await fetch(hook.url, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/json', 'x-visitvise-event': event, 'x-visitvise-signature': `sha256=${sig}` }, body });
      await Webhook.updateOne({ _id: hook._id }, { lastStatus: r.status, lastAt: new Date() });
      if (r.status < 500) return;
    } catch (e) { await Webhook.updateOne({ _id: hook._id }, { lastStatus: 0, lastAt: new Date() }); }
  }
}
/** Fire-and-forget fan-out to the site's subscribed webhooks. */
function emitWebhook(siteId, event, data) {
  Webhook.find({ active: true, events: event, $or: [{ siteId }, { siteId: null }, { siteId: { $exists: false } }] }).limit(20).lean()
    .then((hooks) => hooks.forEach((h) => deliver(h, event, data))).catch((e) => console.error('webhook failed:', e.message));
}
module.exports = { assertSafeUrl, emitWebhook };
