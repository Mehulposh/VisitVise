const env = require('../config/env');
/** SMS or WhatsApp through Twilio's REST API (no SDK). channel: 'sms' | 'whatsapp'. Never throws. */
async function sendMessage(channel, to, text) {
  try {
    const { sid, token, smsFrom, waFrom } = env.twilio, from = channel === 'whatsapp' ? waFrom : smsFrom;
    const num = String(to).replace(/[^\d+]/g, ''), e164 = num.startsWith('+') ? num : `${env.countryCode}${num}`;
    if (!sid || !token || !from) { if (!env.isProd) console.log(`[${channel}:dev] ${e164}: ${text}`); return; }
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: channel === 'whatsapp' ? `whatsapp:${e164}` : e164, From: from, Body: text }), signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error(`${channel} failed (${r.status})`);
  } catch (e) { console.error(`${channel} failed:`, e.message); }
}
module.exports = { sendMessage };
