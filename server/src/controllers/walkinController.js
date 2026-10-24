
const { User, Area, Visit } = require('../models');
const P = require('../utils/pure');
const emails = require('../utils/emails');

const {
  AppError,
  escapeRegex,
  sha256,
  safeEqual,
} = require('../utils/helpers');

const {
  siteOf,
  nowFor,
  createVisit,
  decideVisit,
  publishVisit,
  newApprovalToken,
} = require('../services/visits');

const { notifyHost } = require('../services/notify');
const { removeFile } = require('../middleware/upload');

const log = (e) => console.error(e.message);

// Search available hosts without exposing email addresses.
const getWalkInHosts = async (req, res) => {
  const regex = new RegExp(escapeRegex(req.validQuery.q), 'i');

  const hosts = await User.find({
    role: { $in: ['user', 'admin'] },
    isActive: { $ne: false },
    name: regex,
  })
    .select('name department')
    .limit(8)
    .lean();

  res.send(
    hosts.map((host) => ({
      id: String(host._id),
      name: host.name,
      department: host.department,
    }))
  );
};

// Register a walk-in visitor and request host approval.
const createWalkIn = async (req, res) => {
  try {
    const host = await User.findOne({
      _id: req.body.hostId,
      role: { $in: ['user', 'admin'] },
      isActive: { $ne: false },
    });

    if (!host) {
      throw new AppError('Host not found', 404);
    }

    const site = await siteOf(host);
    const now = nowFor(site);

    const end = P.addMinutesLocal(
      now.date,
      now.time,
      site.walkinHours * 60
    );

    const area =
      (await Area.findOne({
        siteId: site._id,
        name: 'Lobby',
        active: { $ne: false },
      })) ||
      (await Area.findOne({
        siteId: site._id,
        active: { $ne: false },
        requiresApproval: false,
      }));

    if (!area) {
      throw new AppError('No public area is configured', 409);
    }

    const token = newApprovalToken();
    const { consent, hostId, ...rest } = req.body;

    const visit = await createVisit({
      host,
      site,
      input: {
        ...rest,
        date: now.date,
        from: now.time,
        to: end.time,
        areas: [area.name],
        notifyVia: ['email'],
      },
      extra: {
        status: 'pending_approval',
        walkIn: true,
        approval: { tokenHash: token.tokenHash },
        consentAt: new Date(),
        photo: req.file
          ? { filename: req.file.filename }
          : undefined,
      },
    });

    emails
      .approvalRequest(visit, host, visit._id, token.token)
      .catch(log);

    notifyHost(visit, {
      type: 'walkin_pending',
      title: `${visit.visitorName} is waiting at reception`,
      body:
        `${visit.visitorName} is asking for you. ` +
        'Approve or deny within 15 minutes.',
      link: `/visits/${visit._id}`,
    });

    publishVisit('visit.walkin_pending', visit);

    res.status(201).send({
      code: visit.code,
      status: visit.status,
      message: `Waiting for ${host.name} to approve your visit.`,
    });
  } catch (error) {
    if (req.file) {
      removeFile('photos', req.file.filename);
    }

    throw error;
  }
};

// Validate the long random token used in the emailed approval link.
const byToken = async (req) => {
  const visit = await Visit.findById(req.params.id)
    .select('+approval.tokenHash');

  if (
    !visit ||
    !visit.approval?.tokenHash ||
    !safeEqual(
      visit.approval.tokenHash,
      sha256(req.params.token || '')
    )
  ) {
    throw new AppError(
      'This link is invalid or has expired',
      404
    );
  }

  return visit;
};

// Return only the information needed by the approval page.
const getApprovalDetails = async (req, res) => {
  const visit = await byToken(req);

  res.send({
    visitorName: visit.visitorName,
    company: visit.company,
    purpose: visit.purpose,
    hostName: visit.hostName,
    status: visit.status,
    hasPhoto: !!visit.photo?.filename,
  });
};

// Process an approval or denial from the emailed link.
const submitApprovalDecision = async (req, res) => {
  const visit = await byToken(req);

  await decideVisit(visit, req.body.decision, null);

  res.send({
    ok: true,
    status: visit.status,
  });
};

module.exports = {
  getWalkInHosts,
  createWalkIn,
  getApprovalDetails,
  submitApprovalDecision,
};
