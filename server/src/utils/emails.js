const { send } = require('../middleware/mailer');
const link = c => `${process.env.APP_URL || 'http://localhost:3000'}/pass/${c}`;
const when = v => `${v.date}, ${v.from}-${v.to}`;
exports.visitScheduled = v => {
  send(v.email, `Your visitor pass for ${when(v)}`,
    `<p>Hello ${v.visitorName},</p><p>${v.hostName} has registered you for a visit on <b>${when(v)}</b>.</p>
     <p>Areas you can access: <b>${v.areas.join(', ')}</b></p>
     <p>Pass code: <b style="font-size:20px">${v.code}</b><br><a href="${link(v.code)}">View / download your badge</a></p>`);
  send(v.hostEmail, `Visitor registered: ${v.visitorName}`,
    `<p>${v.visitorName} is registered for ${when(v)}. Pass code: <b>${v.code}</b>.</p>`);
};
exports.visitorArrived = v => send(v.hostEmail, `${v.visitorName} has arrived`,
  `<p>Your visitor <b>${v.visitorName}</b>${v.company ? ' (' + v.company + ')' : ''} has checked in at ${new Date().toLocaleTimeString()}.</p>`);
exports.visitCancelled = v => {
  send(v.email, 'Your visit was cancelled', `<p>Your visit on ${when(v)} with ${v.hostName} has been cancelled.</p>`);
  send(v.hostEmail, 'Visit cancelled', `<p>The visit for ${v.visitorName} on ${when(v)} was cancelled.</p>`);
};
exports.accessDenied = (v, area, reason) => send(v.hostEmail, `Access denied for ${v.visitorName}`,
  `<p>${v.visitorName} was refused entry to <b>${area}</b>: ${reason}.</p>`);