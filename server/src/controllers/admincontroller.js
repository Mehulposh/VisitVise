
const crypto = require("crypto");

const { User, Site, Visit } = require("../models");
const emails = require("../utils/emails");
const env = require("../config/env");

const {
  AppError,
  pageOpts,
  pagination,
  randomToken,
  sha256,
  same,
  escapeRegex,
} = require("../utils/helpers");

const { siteOf, nowFor } = require("../services/visits");
const { record } = require("../services/audit");

const log = (error) => console.error(error.message);

const rx = (value) =>
  new RegExp(escapeRegex(String(value).slice(0, 60)), "i");

const adminCount = (excludeId) =>
  User.countDocuments({
    role: "admin",
    isActive: { $ne: false },
    ...(excludeId && { _id: { $ne: excludeId } }),
  });

exports.getDashboardData = async (req, res) => {
  const site = await siteOf(req.user);

  const [visits, users] = await Promise.all([
    Visit.find().sort({ created: -1 }).limit(300),
    User.find().sort({ created: -1 }).limit(300),
  ]);

  res.send({
    today: nowFor(site).date,
    visits: visits.map((visit) => visit.toJSON()),
    users: users.map((user) => user.toJSON()),
  });
};

exports.getUsers = async (req, res) => {
  const p = pageOpts(req.query, 25, 200);
  const filter = {};

  if (["user", "security", "admin"].includes(req.query.role)) {
    filter.role = req.query.role;
  }

  if (req.query.q) {
    filter.$or = [
      { name: rx(req.query.q) },
      { email: rx(req.query.q) },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ created: -1 })
      .skip(p.skip)
      .limit(p.limit),
    User.countDocuments(filter),
  ]);

  res.send({
    items: items.map((user) => user.toJSON()),
    pagination: pagination(p, total),
  });
};

exports.createUser = async (req, res) => {
  if (await User.exists({ email: req.body.email })) {
    throw new AppError("Email already registered", 409);
  }

  const site = req.body.siteId
    ? await Site.findById(req.body.siteId)
    : await siteOf(null);

  if (!site) {
    throw new AppError("Site not found", 404);
  }

  const token = randomToken();

  const user = await User.create({
    ...req.body,
    siteId: site._id,
    password:
      req.body.password || crypto.randomBytes(24).toString("base64"),
    emailVerified: !!req.body.password,
    resetToken: sha256(token),
    resetExpires: new Date(Date.now() + 7 * 864e5),
  });

  if (!req.body.password) {
    emails
      .invite(user, `${env.appUrl}/reset-password?token=${token}`)
      .catch(log);
  }

  record(req.user, "user.create", user._id, {
    role: user.role,
  });

  res.status(201).send(user.toJSON());
};
