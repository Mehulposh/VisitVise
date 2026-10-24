
const { Visit, Scan } = require('../models');
const P = require('../utils/pure');
const emails = require('../utils/emails');

const {
  AppError,
  escapeRegex,
  pageOpts,
  pagination,
  randomToken,
} = require('../utils/helpers');

const {
  siteOf,
  nowFor,
  createVisit,
  validateInput,
  isBlocked,
  canManage,
  hostIdsFor,
  decideVisit,
  checkoutVisit,
  publishVisit,
  deliverPass,
} = require('../services/visits');

const { notifyStaff } = require('../services/notify');

const log = (e) => console.error(e.message);

const load = async (req) => {
  const visit = await Visit.findById(req.params.id);

  if (!visit || !(await canManage(req.user, visit))) {
    throw new AppError('Visit not found', 404);
  }

  return visit;
};

// Create a single visit or a recurring series.
const createSingleOrRecurringVisit = async (req, res) => {
  const site = await siteOf(req.user);
  const { repeat, ...input } = req.body;

  if (!repeat) {
    const visit = await createVisit({
      host: req.user,
      site,
      input,
    });

    return res.status(201).send(visit.toJSON());
  }

  if (repeat.until <= input.date) {
    throw new AppError(
      'The repeat end date must be after the first visit',
      400
    );
  }

  const dates = P.expandDates(
    input.date,
    repeat.until,
    repeat.weekdays,
    60
  );

  if (!dates.length) {
    throw new AppError(
      'No dates match the chosen weekdays',
      400
    );
  }

  // Validate every date before creating any visits.
  for (const date of dates) {
    await validateInput(
      { ...input, date, endDate: undefined },
      site,
      req.user
    );
  }

  const seriesId = randomToken().slice(0, 16);
  const made = [];

  for (const date of dates) {
    made.push(
      await createVisit({
        host: req.user,
        site,
        input: { ...input, date, endDate: undefined },
        extra: { seriesId },
      })
    );
  }

  res.status(201).send({
    ...made[0].toJSON(),
    seriesId,
    count: made.length,
    ids: made.map((visit) => String(visit._id)),
  });
};

// Create one invitation for multiple visitors.
const createGroupVisit = async (req, res) => {
  const site = await siteOf(req.user);
  const { visitors, ...shared } = req.body;

  for (const person of visitors) {
    if (await isBlocked(person)) {
      throw new AppError(
        `${person.visitorName} cannot be registered. Please contact security.`,
        403,
        'BLOCKED'
      );
    }
  }

  await validateInput(shared, site, req.user);

  const groupId = randomToken().slice(0, 16);
  const made = [];

  for (const person of visitors) {
    made.push(
      await createVisit({
        host: req.user,
        site,
        input: { ...shared, ...person },
        extra: { groupId },
      })
    );
  }

  res.status(201).send({
    groupId,
    count: made.length,
    visits: made.map((visit) => visit.toJSON()),
  });
};

// List visits, with backwards-compatible array responses when page is absent.
const getVisits = async (req, res) => {
  const q = req.validQuery;
  const filter = {
    hostId: { $in: await hostIdsFor(req.user) },
  };

  if (q.status) {
    filter.status = q.status;
  }

  if (q.from || q.to) {
    filter.date = {
      ...(q.from && { $gte: q.from }),
      ...(q.to && { $lte: q.to }),
    };
  }

  if (q.q) {
    const regex = new RegExp(escapeRegex(q.q), 'i');

    filter.$or = [
      { visitorName: regex },
      { company: regex },
      { code: regex },
      { email: regex },
    ];
  }

  if (!q.page) {
    const visits = await Visit.find(filter)
      .sort({ date: -1, from: -1 })
      .limit(500);

    return res.send(visits.map((visit) => visit.toJSON()));
  }

  const page = pageOpts(q, 20, 100);

  const [items, total] = await Promise.all([
    Visit.find(filter)
      .sort({ date: -1, from: -1 })
      .skip(page.skip)
      .limit(page.limit),

    Visit.countDocuments(filter),
  ]);

  res.send({
    items: items.map((visit) => visit.toJSON()),
    pagination: pagination(page, total),
  });
};

// Returning-visitor autocomplete based on the current user's past visits.
const suggestVisitors = async (req, res) => {
  const regex = new RegExp(escapeRegex(req.validQuery.q), 'i');

  const rows = await Visit.aggregate([
    {
      $match: {
        hostId: { $in: await hostIdsFor(req.user) },
        anonymised: { $ne: true },
        $or: [
          { visitorName: regex },
          { company: regex },
          { email: regex },
        ],
      },
    },
    { $sort: { created: -1 } },
    {
      $group: {
        _id: {
          $toLower: {
            $ifNull: [
              {
                $cond: [
                  { $eq: ['$email', ''] },
                  '$visitorName',
                  '$email',
                ],
              },
              '$visitorName',
            ],
          },
        },
        visitorName: { $first: '$visitorName' },
        company: { $first: '$company' },
        email: { $first: '$email' },
        phone: { $first: '$phone' },
        last: { $first: '$date' },
      },
    },
    { $sort: { last: -1 } },
    { $limit: 8 },
    {
      $project: {
        _id: 0,
        visitorName: 1,
        company: 1,
        email: 1,
        phone: 1,
        last: 1,
      },
    },
  ]);

  res.send(rows);
};

// Get a visit and its recent scan history.
const getVisitById = async (req, res) => {
  const visit = await load(req);

  const scans = await Scan.find({ visitId: visit._id })
    .sort({ at: -1 })
    .limit(30)
    .lean();

  res.send({
    ...visit.toJSON(),
    scans: scans.map(({ at, area, ok, reason, mode }) => ({
      at,
      area,
      ok,
      reason,
      mode,
    })),
  });
};

// Edit, cancel, or manually check out a visit.
const updateVisit = async (req, res) => {
  const visit = await load(req);
  const { status, ...edit } = req.body;

  if (status === 'cancelled') {
    if (!['expected', 'pending_approval'].includes(visit.status)) {
      throw new AppError(
        'Only visits that have not arrived can be cancelled',
        409
      );
    }

    visit.status = 'cancelled';
    await visit.save();

    publishVisit('visit.cancelled', visit);

    if (visit.email) {
      emails.visitCancelled(visit).catch(log);
    }

    return res.send(visit.toJSON());
  }

  if (status === 'checked_out') {
    if (!['security', 'admin'].includes(req.user.role)) {
      throw new AppError(
        'Only security can check visitors out',
        403
      );
    }

    if (visit.status !== 'checked_in') {
      throw new AppError('Visitor is not checked in', 409);
    }

    return res.send((await checkoutVisit(visit)).toJSON());
  }

  if (!Object.keys(edit).length) {
    throw new AppError('Nothing to change', 400);
  }

  if (!['expected', 'pending_approval'].includes(visit.status)) {
    throw new AppError(
      'Only visits that have not arrived can be edited',
      409
    );
  }

  const site = await siteOf(visit.siteId);
  const newDate = edit.date || visit.date;

  const newEnd =
    'endDate' in edit
      ? edit.endDate
      : edit.date
        ? undefined
        : visit.endDate;

  const merged = {
    visitorName: visit.visitorName,
    email: visit.email,
    phone: visit.phone,
    from: visit.from,
    to: visit.to,
    areas: visit.areas,
    ...edit,
    date: newDate,
    endDate: newEnd && newEnd !== newDate ? newEnd : undefined,
  };

  if (edit.visitorName || edit.email || edit.phone) {
    if (await isBlocked(merged)) {
      throw new AppError(
        'This visitor cannot be registered. Please contact security.',
        403,
        'BLOCKED'
      );
    }
  }

  const { restricted } = await validateInput(
    merged,
    site,
    req.user
  );

  const before = {
    date: visit.date,
    from: visit.from,
    to: visit.to,
    areas: visit.areas.join(),
  };

  Object.assign(visit, edit, {
    date: newDate,
    endDate: merged.endDate,
  });

  visit.approvedAreas =
    req.user.role === 'admin'
      ? restricted
      : visit.approvedAreas.filter((area) =>
          restricted.includes(area)
        );

  const newRestricted = restricted.filter(
    (area) => !visit.approvedAreas.includes(area)
  );

  await visit.save();

  if (newRestricted.length && req.user.role !== 'admin') {
    notifyStaff(
      site._id,
      {
        type: 'approval_needed',
        title: 'Restricted-area approval needed',
        body:
          `${visit.hostName} changed ${visit.visitorName}'s areas: ` +
          `${newRestricted.join(', ')}.`,
        link: `/admin/visits/${visit._id}`,
      },
      ['admin']
    );
  }

  if (
    visit.email &&
    visit.status === 'expected' &&
    (
      before.date !== visit.date ||
      before.from !== visit.from ||
      before.to !== visit.to ||
      before.areas !== visit.areas.join()
    )
  ) {
    emails.visitUpdated(visit, site).catch(log);
  }

  res.send(visit.toJSON());
};

// Resend a pass, enforcing the per-day limit.
const resendVisitPass = async (req, res) => {
  const visit = await load(req);

  if (visit.status !== 'expected') {
    throw new AppError(
      'The pass can only be re-sent before the visitor arrives',
      409
    );
  }

  if (!visit.email && !visit.phone) {
    throw new AppError(
      'This visitor has no email or phone',
      400
    );
  }

  const site = await siteOf(visit.siteId);
  const day = nowFor(site).date;

  if (visit.resend?.day === day && visit.resend.n >= 5) {
    throw new AppError(
      'The pass was already re-sent 5 times today',
      429
    );
  }

  visit.resend = {
    day,
    n: visit.resend?.day === day
      ? visit.resend.n + 1
      : 1,
  };

  await visit.save();
  await deliverPass(visit, site);

  res.send({ ok: true });
};

// Approve or deny a walk-in visit.
const decideWalkInVisit = async (req, res) => {
  const visit = await load(req);

  res.send(
    (
      await decideVisit(
        visit,
        req.body.decision,
        req.user,
        req.body.areas
      )
    ).toJSON()
  );
};

// Download a visit calendar event.
const getVisitCalendar = async (req, res) => {
  const visit = await load(req);
  const site = await siteOf(visit.siteId);
  const env = require('../config/env');

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

module.exports = {
  createSingleOrRecurringVisit,
  createGroupVisit,
  getVisits,
  suggestVisitors,
  getVisitById,
  updateVisit,
  resendVisitPass,
  decideWalkInVisit,
  getVisitCalendar,
};
