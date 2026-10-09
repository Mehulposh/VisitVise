const nodemailer = require('nodemailer');
const transport = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
}) : null;
// Fire-and-forget: an email failure never breaks the API request.
exports.send = async (to, subject, html) => {
  if (!to) return;
  if (!transport) return console.log(`[mail disabled] to=${to} subject="${subject}"`);
  try { await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, html }); }
  catch (e) { console.error('Mail error:', e.message); }
};