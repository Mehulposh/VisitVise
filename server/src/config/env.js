const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';
const fatal = (m) => { console.error(`FATAL: ${m}`); process.exit(1); };
const list = (v, d = '') => (v || d).split(',').map((s) => s.trim()).filter(Boolean);

if (!process.env.JWT_SECRET) fatal('JWT_SECRET is not set. Copy .env.example to .env.');
if (isProd && process.env.JWT_SECRET.length < 32) fatal('JWT_SECRET must be at least 32 characters in production.');
if (isProd && !process.env.MONGO_URI) fatal('MONGO_URI must be set in production.');
const tz = process.env.SITE_TIMEZONE || 'Asia/Kolkata';
try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch { fatal(`SITE_TIMEZONE "${tz}" is not a valid IANA timezone.`); }

const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
module.exports = {
  isProd, appUrl, timezone: tz,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/visitor_management',
  jwtSecret: process.env.JWT_SECRET, jwtExpires: process.env.JWT_EXPIRES || '1d',
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  origins: [appUrl, ...list(process.env.CLIENT_URLS, 'http://localhost:5173')],
  clientDist: path.resolve(__dirname, '../..', process.env.CLIENT_DIST || '../client/dist'),
  uploadDir: path.resolve(__dirname, '../../uploads'),
  adminEmail: (process.env.ADMIN_EMAIL || '').toLowerCase(), adminPassword: process.env.ADMIN_PASSWORD || '',
  kioskKey: process.env.KIOSK_KEY || '',
  smtp: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, from: process.env.MAIL_FROM || 'VisitPass <no-reply@localhost>' },
  twilio: { sid: process.env.TWILIO_SID, token: process.env.TWILIO_TOKEN, smsFrom: process.env.TWILIO_SMS_FROM, waFrom: process.env.TWILIO_WHATSAPP_FROM },
  countryCode: process.env.DEFAULT_COUNTRY_CODE || '+91',
};
