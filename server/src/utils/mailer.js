const env = require('../config/env');
let transport;
/** attachments: nodemailer attachment objects. Without SMTP, mail is printed in development and skipped in production. */
async function send(to, subject, html, attachments = []) {
  if (!to) return;
  if (!env.smtp.host) { console.log(env.isProd ? `[mail] SMTP not configured, skipped "${subject}"` : `[mail:dev] to=${to}\n  ${subject}\n  ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300)}`); return; }
  transport ||= require('nodemailer').createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465, auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined });
  await transport.sendMail({ from: env.smtp.from, to, subject, html, attachments });
}
module.exports = { send };
