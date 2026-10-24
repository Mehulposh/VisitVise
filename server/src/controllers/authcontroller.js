
const bcrypt = require("bcryptjs");

const env = require("../config/env");
const { User, Area } = require("../models");
const { AppError, sha256, randomToken } = require("../utils/helpers");
const emails = require("../utils/emails");
const { sign, setCookie, clearCookie } = require("../middleware/auth");
const { defaultSite, siteOf, nowFor } = require("../services/visits");

const MAX_FAILS = 5;
const LOCK_MIN = 15;

// Equalises password-check timing for unknown emails.
const DUMMY = bcrypt.hashSync("not-a-real-password", 12);

const log = (error) => console.error(error.message);

const session = (res, user, code = 200) => {
  const token = sign(user);
  setCookie(res, token);

  return res.status(code).send({
    token,
    user: user.toJSON(),
  });
};

const publicSite = (site) => ({
  id: String(site._id),
  name: site.name,
  timezone: site.timezone,
  workingHours: site.workingHours,
  workingDays: site.workingDays,
  blackoutDates: site.blackoutDates,
  requireAgreement: site.requireAgreement,
  agreementVersion: site.agreementVersion,
  requireHealthDeclaration: site.requireHealthDeclaration,
  walkinHours: site.walkinHours,
});

const link = (path, token) =>
  `${env.appUrl}${path}?token=${token}`;

const setPassword = async (user, plainPassword) => {
  user.password = plainPassword;
  user.passwordChangedAt = new Date(Date.now() - 2000);
  user.failedLogins = 0;
  user.lockUntil = undefined;
};

// POST /register
exports.register = async (req, res) => {
  if (await User.exists({ email: req.body.email })) {
    throw new AppError("Email already registered", 409);
  }

  const site = await defaultSite();
  const token = randomToken();

  const user = await User.create({
    ...req.body,
    role: "user",
    siteId: site._id,
    emailVerifyToken: sha256(token),
    emailVerifyExpires: new Date(Date.now() + 24 * 3600e3),
  });

  emails
    .verifyEmail(user, link("/verify-email", token))
    .catch(log);

  session(res, user, 201);
};

// POST /login
exports.login = async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  }).select("+password");

  if (user?.lockUntil && user.lockUntil > new Date()) {
    throw new AppError(
      "Too many failed attempts. Try again in a few minutes.",
      429
    );
  }

  const isValid = await bcrypt.compare(
    req.body.password,
    user?.password || DUMMY
  );

  if (!user || !isValid) {
    if (user) {
      user.failedLogins = (user.failedLogins || 0) + 1;

      if (user.failedLogins >= MAX_FAILS) {
        user.lockUntil = new Date(
          Date.now() + LOCK_MIN * 60e3
        );
        user.failedLogins = 0;
      }

      await user.save();
    }

    throw new AppError("Invalid email or password", 401);
  }

  if (user.isActive === false) {
    throw new AppError("This account has been disabled", 403);
  }

  if (user.failedLogins || user.lockUntil) {
    user.failedLogins = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  session(res, user);
};

// POST /logout
exports.logout = (req, res) => {
  clearCookie(res);
  res.send({ ok: true });
};

// GET /me
exports.getMe = async (req, res) => {
  const site = await siteOf(req.user);

  const areas = await Area.find({
    siteId: site._id,
    active: { $ne: false },
  })
    .sort({ name: 1 })
    .lean();

  const delegate = req.user.delegateId
    ? await User.findById(req.user.delegateId)
        .select("name email")
    : null;

  res.send({
    user: req.user.toJSON(),
    areas: areas.map((area) => area.name),
    areaDetails: areas.map((area) => ({
      name: area.name,
      requiresApproval: !!area.requiresApproval,
      capacity: area.capacity,
    })),
    today: nowFor(site).date,
    site: publicSite(site),
    delegate: delegate
      ? { name: delegate.name, email: delegate.email }
      : null,
  });
};

// POST /auth/verify-email
exports.verifyEmail = async (req, res) => {
  const user = await User.findOne({
    emailVerifyToken: sha256(req.body.token),
    emailVerifyExpires: { $gt: new Date() },
  }).select("+emailVerifyToken +emailVerifyExpires");

  if (!user) {
    throw new AppError("Verification link is invalid or expired", 400);
  }

  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;

  await user.save();

  res.send({ ok: true });
};

// POST /auth/resend-verification
exports.resendVerification = async (req, res) => {
  if (req.user.emailVerified) {
    return res.send({ ok: true });
  }

  const token = randomToken();

  await User.updateOne(
    { _id: req.user._id },
    {
      emailVerifyToken: sha256(token),
      emailVerifyExpires: new Date(Date.now() + 24 * 3600e3),
    }
  );

  emails
    .verifyEmail(req.user, link("/verify-email", token))
    .catch(log);

  res.send({ ok: true });
};

// POST /auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  });

  if (user && user.isActive !== false) {
    const token = randomToken();

    await User.updateOne(
      { _id: user._id },
      {
        resetToken: sha256(token),
        resetExpires: new Date(Date.now() + 3600e3),
      }
    );

    emails
      .passwordReset(user, link("/reset-password", token))
      .catch(log);
  }

  // Same response whether the account exists or not.
  res.send({
    ok: true,
    message: "If that email exists, a reset link has been sent.",
  });
};

// POST /auth/reset-password
exports.resetPassword = async (req, res) => {
  const user = await User.findOne({
    resetToken: sha256(req.body.token),
    resetExpires: { $gt: new Date() },
  }).select("+resetToken +resetExpires");

  if (!user) {
    throw new AppError("Reset link is invalid or expired", 400);
  }

  await setPassword(user, req.body.password);

  user.resetToken = undefined;
  user.resetExpires = undefined;
  user.emailVerified = true;

  await user.save();

  res.send({ ok: true });
};

// POST /auth/change-password
exports.changePassword = async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("+password");

  if (!(await user.matches(req.body.currentPassword))) {
    throw new AppError("Current password is incorrect", 400);
  }

  await setPassword(user, req.body.newPassword);
  await user.save();

  session(res, user);
};

// PATCH /auth/settings
exports.updateSettings = async (req, res) => {
  Object.assign(req.user, req.body);

  await req.user.save();

  res.send({ user: req.user.toJSON() });
};

// PUT /me/delegate
exports.updateDelegate = async (req, res) => {
  if (req.body.email === null) {
    req.user.delegateId = undefined;
    await req.user.save();

    return res.send({ delegate: null });
  }

  const delegate = await User.findOne({
    email: req.body.email,
    isActive: { $ne: false },
  }).select("name email");

  if (
    !delegate ||
    String(delegate._id) === String(req.user._id)
  ) {
    throw new AppError("Choose a different active user", 400);
  }

  req.user.delegateId = delegate._id;
  await req.user.save();

  res.send({
    delegate: {
      name: delegate.name,
      email: delegate.email,
    },
  });
};

exports.publicSite = publicSite;
