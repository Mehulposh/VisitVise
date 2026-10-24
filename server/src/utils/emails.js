const QRCode = require('qrcode');
const env = require('../config/env');
const { send } = require('./mailer');
const { escapeHtml: e, buildIcs } = require('./pure');

// Every value that came from a person is escaped: names and companies can no longer inject HTML into mails.
const link = (code) => `${env.appUrl}/pass/${code}`;
const when = (v) => `${v.date}${v.endDate && v.endDate !== v.date ? ` to ${v.endDate}` : ''}, ${v.from} to ${v.to}`;
const shell = (title, inner) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222"><h2 style="color:#4f46e5">${e(title)}</h2>${inner}<hr style="border:none;border-top:1px solid #eee"><p style="color:#888;font-size:12px">VisitPass</p></div>`;
const btn = (href, text, color = '#4f46e5') => `<p><a href="${e(href)}" style="background:${color};color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">${e(text)}</a></p>`;

async function passFiles(v, site) {
  const png = await QRCode.toBuffer(link(v.code), { margin: 1, width: 240 });
  return [{ filename: 'pass-qr.png', content: png, cid: 'passqr' },
    { filename: 'visit.ics', content: buildIcs(v, { appUrl: env.appUrl, siteName: site?.name, tz: site?.timezone || env.timezone }), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }];
}
const passBody = (v) => `<p>Pass code: <b style="font-size:20px;letter-spacing:2px">${e(v.code)}</b></p><p><img src="cid:passqr" alt="QR code" width="160" height="160"></p>
  <p>When: ${e(when(v))}<br>Host: ${e(v.hostName)}<br>Areas: ${e((v.areas || []).join(', '))}</p>${btn(link(v.code), 'Open my pass and badge')}<p style="color:#666;font-size:13px">Show the QR code (or the code) at the gate. A calendar invite is attached.</p>`;

exports.visitScheduled = async (v, site) => send(v.email, `Your visitor pass for ${when(v)}`, shell(`Hello ${v.visitorName}`, `<p>${e(v.hostName)} has registered your visit.</p>${passBody(v)}`), await passFiles(v, site));
exports.visitUpdated = async (v, site) => send(v.email, `Your visit was updated: ${when(v)}`, shell('Your visit was updated', `<p>${e(v.hostName)} changed the details of your visit.</p>${passBody(v)}`), await passFiles(v, site));
exports.visitCancelled = (v) => send(v.email, 'Your visit was cancelled', shell('Visit cancelled', `<p>Your visit on ${e(when(v))} with ${e(v.hostName)} has been cancelled.</p>`));
exports.visitorArrived = (v) => send(v.hostEmail, `${v.visitorName} has arrived`, shell('Your visitor has arrived', `<p><b>${e(v.visitorName)}</b>${v.company ? ` (${e(v.company)})` : ''} just checked in.</p>`));
exports.accessDenied = (v, area, reason) => send(v.hostEmail, `Access refused for ${v.visitorName}`, shell('Access refused', `<p>${e(v.visitorName)} was refused at <b>${e(area || 'the gate')}</b>.</p><p>Reason: ${e(reason)}</p>`));
exports.approvalRequest = (v, host, id, token) => send(host.email, `${v.visitorName} is waiting at reception`, shell('A visitor is waiting', `<p><b>${e(v.visitorName)}</b>${v.company ? ` from ${e(v.company)}` : ''} is asking for you.<br>Purpose: ${e(v.purpose)}</p>${btn(`${env.appUrl}/approve/${id}/${token}?d=approve`, 'Approve entry', '#16a34a')}${btn(`${env.appUrl}/approve/${id}/${token}?d=deny`, 'Deny entry', '#dc2626')}<p style="color:#666;font-size:13px">The request expires in 15 minutes.</p>`));
exports.walkinResult = async (v, approved, site) => approved
  ? send(v.email, 'You are approved to enter', shell('You are approved', `<p>${e(v.hostName)} approved your visit.</p>${passBody(v)}`), await passFiles(v, site))
  : send(v.email, 'Your visit request was not approved', shell('Request not approved', `<p>${e(v.hostName)} could not approve your visit request. Please speak to reception.</p>`));
exports.noShow = (v) => send(v.hostEmail, `${v.visitorName} did not arrive`, shell('Visitor did not arrive', `<p>${e(v.visitorName)} did not check in for the visit on ${e(when(v))}.</p>`));
exports.overstay = (v) => send(v.hostEmail, `${v.visitorName} is still on site`, shell('Visitor overstay', `<p>${e(v.visitorName)} is still checked in after the end of the visit window (${e(v.to)}).</p>`));
exports.verifyEmail = (u, href) => send(u.email, 'Verify your email', shell('Verify your email', `<p>Hi ${e(u.name)}, confirm your email address:</p>${btn(href, 'Verify email')}`));
exports.passwordReset = (u, href) => send(u.email, 'Reset your password', shell('Reset your password', `<p>Use the button below within 1 hour. Ignore this email if you did not ask for it.</p>${btn(href, 'Choose a new password')}`));
exports.invite = (u, href) => send(u.email, 'Your VisitPass account', shell('Welcome to VisitPass', `<p>Hi ${e(u.name)}, an account was created for you (${e(u.role)}). Set your password:</p>${btn(href, 'Set my password')}`));
exports.link = link; exports.when = when;
