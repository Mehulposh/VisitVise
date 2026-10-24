
const { Visit, Scan } = require("../models");
const P = require("../utils/pure");
const { AppError, same } = require("../utils/helpers");

const {
  siteOf,
  nowFor,
  checkoutVisit,
  publishVisit,
} = require("../services/visits");

const { scan, deliveryEntry } = require("../services/gate");
const { record } = require("../services/audit");
const { removeFile } = require("../middleware/upload");

// Scan a visitor's QR code.
exports.scanVisitor = async (req, res) => {
  const result = await scan({
    code: P.extractCode(req.body.code),
    area: req.body.area,
    mode: req.body.mode,
    by: req.user,
  });

  res.send(result);
};

// Register a delivery at the gate.
exports.registerDelivery = async (req, res) => {
  const delivery = await deliveryEntry({
    by: req.user,
    ...req.body,
  });

  res.status(201).send(delivery.toJSON());
};

// Restrict security staff to their own site.
// Admins can optionally filter by siteId.
const siteScope = async (req) => {
  if (req.user.role === "security" && req.user.siteId) {
    return { siteId: req.user.siteId };
  }

  return req.query.siteId &&
    /^[a-f\d]{24}$/i.test(req.query.siteId)
    ? { siteId: req.query.siteId }
    : {};
};

const staffView = (visit) => ({
  ...visit.toJSON(),
  visitorPhone: visit.phone,
});

// Load a visit while enforcing site-level access.
const loadVisit = async (req) => {
  const visit = await Visit.findById(req.params.id);

  if (
    !visit ||
    (req.user.role === "security" &&
      req.user.siteId &&
      !same(req.user.siteId, visit.siteId))
  ) {
    throw new AppError("Visit not found", 404);
  }

  return visit;
};

// Visitors currently checked in.
exports.getOnsiteVisitors = async (req, res) => {
  const visits = await Visit.find({
    ...(await siteScope(req)),
    status: "checked_in",
  })
    .sort({ checkIn: 1 })
    .limit(1000);

  res.send({
    count: visits.length,
    visitors: visits.map(staffView),
  });
};

// Visitors expected on a given date.
exports.getExpectedVisitors = async (req, res) => {
  const scope = await siteScope(req);
  const site = await siteOf(req.user);
  const date = req.validQuery.date || nowFor(site).date;

  const visits = await Visit.find({
    ...scope,
    status: { $in: ["expected", "pending_approval"] },
    date: { $lte: date },
    $or: [
      { endDate: { $gte: date } },
      { endDate: null },
      { endDate: { $exists: false } },
    ],
  })
    .sort({ from: 1 })
    .limit(500);

  res.send({
    date,
    visitors: visits
      .filter((visit) => (visit.endDate || visit.date) >= date)
      .map(staffView),
  });
};

// Upload a visitor's photo.
exports.uploadVisitorPhoto = async (req, res) => {
  if (!req.file) {
    throw new AppError("Attach a photo", 400);
  }

  const visit = await loadVisit(req);

  await removeFile("photos", visit.photo?.filename);

  visit.photo = { filename: req.file.filename };
  await visit.save();

  res.send({ ok: true, hasPhoto: true });
};

// Upload an ID document.
exports.uploadIdDocument = async (req, res) => {
  if (!req.file) {
    throw new AppError("Attach a photo of the ID", 400);
  }

  const visit = await loadVisit(req);

  await removeFile("ids", visit.idDoc?.filename);

  visit.idDoc = {
    filename: req.file.filename,
    type: req.body.idType,
    last4: req.body.idLast4,
  };

  await visit.save();

  res.send({ ok: true });
};

// Update vehicle details.
exports.updateVehicle = async (req, res) => {
  const visit = await loadVisit(req);

  visit.vehicle = {
    ...(visit.vehicle?.toObject?.() || {}),
    ...req.body,
  };

  await visit.save();

  res.send(visit.toJSON());
};

// Manually check out a visitor.
exports.checkoutVisitor = async (req, res) => {
  const visit = await loadVisit(req);

  if (visit.status !== "checked_in") {
    throw new AppError("Visitor is not checked in", 409);
  }

  await Scan.create({
    visitId: visit._id,
    code: visit.code,
    siteId: visit.siteId,
    mode: "checkout",
    ok: true,
    reason: "Checked out (manual)",
    by: req.user._id,
    byName: req.user.name,
    visitorName: visit.visitorName,
  });

  const updatedVisit = await checkoutVisit(visit);

  res.send(updatedVisit.toJSON());
};

// Clear a flagged health declaration after staff review.
exports.clearDeclaration = async (req, res) => {
  const visit = await loadVisit(req);

  if (!visit.declaration?.flagged) {
    throw new AppError("Nothing to clear", 409);
  }

  visit.declaration.flagged = false;
  await visit.save();

  record(req.user, "declaration.cleared", visit._id, {
    visitor: visit.visitorName,
  });

  publishVisit("visit.declaration_cleared", visit);

  res.send({ ok: true });
};
