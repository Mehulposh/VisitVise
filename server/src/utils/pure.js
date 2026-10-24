// Pure helpers (no DB / network): unit-tested with `npm test`.
const crypto = require('crypto');
const net = require('net');

// ---------- time (wall-clock arithmetic in the site's timezone) ----------
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function localParts(d = new Date(), tz = 'UTC') {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === '24' ? '00' : p.hour}:${p.minute}`, dow: DAYS.indexOf(p.weekday) };
}
const utcMs = (date, time = '00:00') => Date.parse(`${date}T${time}:00Z`);
const dowOf = (date) => new Date(utcMs(date)).getUTCDay();
const addDaysStr = (date, n) => new Date(utcMs(date) + n * 864e5).toISOString().slice(0, 10);
function addMinutesLocal(date, time, mins) { const d = new Date(utcMs(date, time) + mins * 60000).toISOString(); return { date: d.slice(0, 10), time: d.slice(11, 16) }; }

/** Is `now` inside the visit's window? Supports multi-day passes and overnight windows (from > to). */
function windowState(v, now) {
  const end = v.endDate || v.date, overnight = v.from > v.to;
  const inRange = (d) => d >= v.date && d <= end;
  const wrongDay = { ok: false, reason: 'Pass not valid today' };
  const outside = { ok: false, reason: `Outside allowed time (${v.from}-${v.to})` };
  if (!overnight) {
    if (!inRange(now.date)) return wrongDay;
    return now.time >= v.from && now.time <= v.to ? { ok: true } : outside;
  }
  const y = addDaysStr(now.date, -1);
  if (inRange(now.date) && now.time >= v.from) return { ok: true };
  if (inRange(y) && now.time <= v.to) return { ok: true };
  return inRange(now.date) || inRange(y) ? outside : wrongDay;
}
/** Minutes since the visit's LAST window closed (negative = still to come). */
function minutesAfterEnd(v, now) {
  const end = v.endDate || v.date, lastDate = v.from > v.to ? addDaysStr(end, 1) : end;
  return Math.floor((utcMs(now.date, now.time) - utcMs(lastDate, v.to)) / 60000);
}
/** Dates from start..until (max 60) on the given weekdays (0=Sun); empty weekdays = every day. */
function expandDates(start, until, weekdays = [], max = 60) {
  const out = []; let d = start;
  for (let i = 0; i < 400 && d <= until && out.length < max; i++, d = addDaysStr(d, 1)) if (!weekdays.length || weekdays.includes(dowOf(d))) out.push(d);
  return out;
}
const closedReason = (site, date) => {
  if (site.blackoutDates?.includes(date)) return `Closed on ${date}`;
  if (site.workingDays?.length && !site.workingDays.includes(dowOf(date))) return `Closed on ${date} (not a working day)`;
  return null;
};
const hoursReason = (site, from, to) => {
  const w = site.workingHours;
  if (!w?.from || !w?.to) return null;
  if (from > to ? !(w.from === '00:00' && w.to === '23:59') : from < w.from || to > w.to) return `Visits must be between ${w.from} and ${w.to}`;
  return null;
};

// ---------- codes ----------
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
const genCode = (len = 10) => Array.from({ length: len }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
/** Accepts a raw code, a pasted pass link, or a QR payload (https://host/pass/CODE?x=y). */
function extractCode(input) {
  const seg = String(input || '').trim().split(/[?#]/)[0].split('/').filter(Boolean).pop() || '';
  const c = seg.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-HJ-NP-Z2-9]{8,12}$/.test(c) ? c : null;
}

// ---------- text ----------
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const passwordOk = (s) => typeof s === 'string' && s.length >= 8 && s.length <= 72 && /[A-Za-z]/.test(s) && /\d/.test(s);
const csvCell = (v) => { let s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (rows, cols) => [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n');

// ---------- calendar (.ics) ----------
const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line) => (line.length <= 73 ? line : line.match(/.{1,73}/g).join('\r\n '));
function buildIcs(v, { appUrl, siteName = '', tz = 'UTC', link } = {}) {
  const end = v.endDate || v.date, endDay = v.from > v.to ? addDaysStr(v.date, 1) : v.date, stamp = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
  const days = Math.round((utcMs(end) - utcMs(v.date)) / 864e5) + 1;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VisitVise//Visitor Pass//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${v.code}@visitvise`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;TZID=${tz}:${stamp(v.date, v.from)}`, `DTEND;TZID=${tz}:${stamp(endDay, v.to)}`];
  if (days > 1) lines.push(`RRULE:FREQ=DAILY;COUNT=${days}`);
  lines.push(`SUMMARY:${icsEsc(`Visit to ${siteName || 'the office'}`)}`, `DESCRIPTION:${icsEsc(`Pass code ${v.code}. Areas: ${(v.areas || []).join(', ')}. ${link || `${appUrl}/pass/${v.code}`}`)}`,
    `LOCATION:${icsEsc(siteName)}`, `URL:${link || `${appUrl}/pass/${v.code}`}`, 'END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// ---------- SSRF guard for webhooks ----------
function isPrivateIp(ip) {
  const k = net.isIP(ip);
  if (k === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 0);
  }
  if (k === 6) {
    const l = ip.toLowerCase();
    if (l === '::1' || l === '::') return true;
    const m = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); if (m) return isPrivateIp(m[1]);
    return /^f[cd]/.test(l) || /^fe[89ab]/.test(l);
  }
  return true; // not an IP: treat as unsafe
}

module.exports = { DAYS, localParts, utcMs, dowOf, addDaysStr, addMinutesLocal, windowState, minutesAfterEnd, expandDates, closedReason, hoursReason, genCode, extractCode, escapeHtml, passwordOk, csvCell, toCsv, buildIcs, isPrivateIp };
