
const path = require('path');
const QRCode = require('qrcode');

const env = require('../config/env');
const { Visit } = require('../models');
const { z } = require('../utils/schemas');
const P = require('../utils/pure');
const emails = require('../utils/emails');
const { AppError } = require('../utils/helpers');

const {
  siteOf,
  anonymise,
  publishVisit,
} = require('../services/visits');

const {
  notifyHost,
  notifyStaff,
} = require('../services/notify');

const getVisit = async (req) => {
  const code = P.extractCode(req.params.code);
  const visit = code && (await Visit.findOne({ code }));

  if (!visit || visit.anonymised) {
    throw new AppError('Pass not found', 404);
  }

  return visit;
};

async function view(visit) {
  const site = await siteOf(visit.siteId);

  return {
    code: visit.code,
    visitorName: visit.visitorName,
    company: visit.company,
    hostName: visit.hostName,
    purpose: visit.purpose,
    date: visit.date,
    endDate: visit.endDate,
    from: visit.from,
    to: visit.to,
    areas: visit.areas,
    status: visit.status,
    checkIn: visit.checkIn,
    checkOut: visit.checkOut,
    hasPhoto: !!visit.photo?.filename,
    walkIn: visit.walkIn,
    siteName: site.name,
    timezone: site.timezone,
    link: emails.link(visit.code),
    qr: `${env.appUrl}/api/pass/${visit.code}/qr.svg`,
    requireAgreement: !!site.requireAgreement,
    agreementText: site.requireAgreement
      ? site.agreementText
      : undefined,
    agreementVersion: site.agreementVersion,
    agreementAccepted:
      !!visit.agreement?.accepted &&
      visit.agreement.version === site.agreementVersion,
    requireHealthDeclaration: !!site.requireHealthDeclaration,
    declarationDone: !!visit.declaration?.at,
    declarationFlagged: !!visit.declaration?.flagged,
  };
};

const getPublicPass = async (req, res) => {
  const visit = await getVisit(req);
  res.send(await view(visit));
};

const getPassQr = async (req, res) => {
  const visit = await getVisit(req);

  const svg = await QRCode.toString(emails.link(visit.code), {
    type: 'svg',
    margin: 1,
    width: 240,
  });

  res
    .set({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'private, max-age=3600',
    })
    .send(svg);
};

const getPassPhoto = async (req, res) => {
  const visit = await getVisit(req);

  if (!visit.photo?.filename) {
    throw new AppError('No photo', 404);
  }

  res.set({
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });

  res.sendFile(
    visit.photo.filename,
    {
      root: path.join(env.uploadDir, 'photos'),
      dotfiles: 'deny',
    },
    (err) => {
      if (err && !res.headersSent) {
        res.status(404).send({ error: 'No photo' });
      }
    }
  );
};

const getPassCalendar = async (req, res) => {
  const visit = await getVisit(req);
  const site = await siteOf(visit.siteId);

  res
    .set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition':
        `attachment; filename="visit-${visit.code}.ics"`,
    })
    .send(
      P.buildIcs(visit, {
        appUrl: env.appUrl,
        siteName: site.name,
        tz: site.timezone,
      })
    );
};

const signAgreement = async (req, res) => {
  const visit = await getVisit(req);
  const site = await siteOf(visit.siteId);

  if (
    !['expected', 'pending_approval', 'checked_in'].includes(
      visit.status
    )
  ) {
    throw new AppError('This pass can no longer be signed', 409);
  }

  visit.agreement = {
    accepted: true,
    version: site.agreementVersion,
    name: req.body.name,
    at: new Date(),
  };

  await visit.save();

  res.send(await view(visit));
};

const submitDeclaration = async (req, res) => {
  const visit = await getVisit(req);

  if (
    !['expected', 'pending_approval', 'checked_in'].includes(
      visit.status
    )
  ) {
    throw new AppError('This pass can no longer be updated', 409);
  }

  const flagged = Object.values(req.body.answers).some(Boolean);

  visit.declaration = {
    answers: req.body.answers,
    flagged,
    at: new Date(),
  };

  await visit.save();

  if (flagged) {
    const body =
      `${visit.visitorName} reported a health symptom before the visit ` +
      'and needs a review at the gate.';

    notifyHost(visit, {
      type: 'declaration',
      title: 'Health declaration flagged',
      body,
      link: '/',
    });

    notifyStaff(visit.siteId, {
      type: 'declaration',
      title: 'Health declaration flagged',
      body,
      link: '/gate',
    });

    publishVisit('visit.declaration_flagged', visit);
  }

  res.send(await view(visit));
};

const forgetVisitorData = async (req, res) => {
  const visit = await getVisit(req);

  if (visit.status === 'checked_in') {
    throw new AppError(
      'You are still checked in. Please check out first.',
      409
    );
  }

  await anonymise(visit);

  res.send({
    ok: true,
    message: 'Your personal data was erased.',
  });
};

module.exports = {
  getPublicPass,
  getPassQr,
  getPassPhoto,
  getPassCalendar,
  signAgreement,
  submitDeclaration,
  forgetVisitorData,
};
