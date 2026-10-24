const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const ref = (m, extra = {}) => ({ type: Schema.Types.ObjectId, ref: m, ...extra });

// ---------------- Site (one building / office; holds its own policy) ----------------
const siteSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 12 },
  address: { type: String, default: '', maxlength: 200 },
  timezone: { type: String, default: env.timezone },
  isActive: { type: Boolean, default: true },
  workingHours: { from: { type: String, default: '00:00' }, to: { type: String, default: '23:59' } },
  workingDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
  blackoutDates: { type: [String], default: [] },
  requireAgreement: { type: Boolean, default: false },
  agreementText: { type: String, default: '', maxlength: 5000 },
  agreementVersion: { type: Number, default: 1 },
  requireHealthDeclaration: { type: Boolean, default: false },
  walkinHours: { type: Number, default: 4, min: 1, max: 12 },     // how long an approved walk-in pass lasts
  graceMinutes: { type: Number, default: 30, min: 0, max: 240 },  // auto check-out this long after the window closes
  retentionDays: { type: Number, default: 0, min: 0, max: 3650 }, // 0 = keep forever; otherwise personal data is anonymised
}, { timestamps: { createdAt: 'created', updatedAt: false } });

// ---------------- Area (was hard-coded) ----------------
const areaSchema = new Schema({
  siteId: ref('Site', { required: true, index: true }),
  name: { type: String, required: true, trim: true, maxlength: 50 },
  capacity: { type: Number, default: 0, min: 0 },          // 0 = unlimited people inside at once
  requiresApproval: { type: Boolean, default: false },     // sensitive area: an admin must approve each visitor
  active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created', updatedAt: false } });
areaSchema.index({ siteId: 1, name: 1 }, { unique: true });

// ---------------- User ----------------
const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'security', 'admin'], default: 'user' },
  department: { type: String, default: '', maxlength: 60 },
  phone: { type: String, default: '' },
  siteId: ref('Site'),
  delegateId: ref('User'),                                  // colleague who also gets notified / can manage my visitors
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: { type: String, select: false }, emailVerifyExpires: { type: Date, select: false },
  resetToken: { type: String, select: false }, resetExpires: { type: Date, select: false },
  passwordChangedAt: Date, failedLogins: { type: Number, default: 0 }, lockUntil: Date,
  notifyEmail: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created', updatedAt: false } });
userSchema.pre('save', async function () { if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12); });
userSchema.methods.matches = function (pw) { return bcrypt.compare(pw, this.password); };
userSchema.set('toJSON', { transform: (d, r) => { r.id = String(r._id); ['_id', '__v', 'password', 'emailVerifyToken', 'emailVerifyExpires', 'resetToken', 'resetExpires', 'failedLogins', 'lockUntil'].forEach((k) => delete r[k]); return r; } });

// ---------------- Visit ----------------
const STATUS = ['pending_approval', 'expected', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'denied'];
const visitSchema = new Schema({
  hostId: ref('User', { required: true, index: true }), hostName: String, hostEmail: String,
  siteId: ref('Site', { index: true }),
  visitorName: { type: String, required: true, trim: true, maxlength: 80 },
  company: { type: String, default: '', maxlength: 80 }, email: { type: String, default: '', maxlength: 120 }, phone: { type: String, default: '', maxlength: 25 },
  purpose: { type: String, default: 'Meeting', maxlength: 40 },
  date: { type: String, required: true, index: true },        // YYYY-MM-DD (first day, site timezone)
  endDate: String,                                             // last day for multi-day passes
  from: { type: String, required: true }, to: { type: String, required: true }, // HH:MM; from > to = overnight window
  areas: [String], approvedAreas: { type: [String], default: [] }, // approvedAreas = sensitive areas an admin approved
  code: { type: String, unique: true, required: true },
  status: { type: String, enum: STATUS, default: 'expected', index: true },
  checkIn: Date, checkOut: Date, autoCheckout: { type: Boolean, default: false }, currentArea: String,
  groupId: String, seriesId: String, walkIn: { type: Boolean, default: false },
  approval: { tokenHash: { type: String, select: false }, decidedBy: ref('User'), decidedAt: Date, reason: String },
  photo: { filename: String }, idDoc: { filename: String, type: String, last4: String },
  agreement: { accepted: Boolean, version: Number, name: String, at: Date },
  declaration: { answers: Schema.Types.Mixed, flagged: Boolean, at: Date },
  vehicle: { plate: { type: String, maxlength: 15 }, type: { type: String, maxlength: 20 }, slot: { type: String, maxlength: 12 } },
  notes: { type: String, default: '', maxlength: 500 },
  notifyVia: { type: [String], default: ['email'] },
  resend: { day: String, n: { type: Number, default: 0 } },
  overstayNotified: { type: Boolean, default: false }, anonymised: { type: Boolean, default: false }, consentAt: Date,
}, { timestamps: { createdAt: 'created', updatedAt: false } });
visitSchema.index({ siteId: 1, status: 1, date: 1 });
visitSchema.set('toJSON', { transform: (d, r) => {
  r.id = String(r._id); r.hostId = String(r.hostId);
  r.hasPhoto = !!r.photo?.filename; r.photo = undefined;
  if (r.idDoc?.filename) r.idDoc = { type: r.idDoc.type, last4: r.idDoc.last4, provided: true }; else r.idDoc = undefined;
  ['_id', '__v', 'hostEmail', 'approval', 'resend'].forEach((k) => delete r[k]); return r;
} });

// ---------------- Scan log (was embedded in Visit; now its own collection so it can be searched and paged) ----------------
const scanSchema = new Schema({
  visitId: ref('Visit', { index: true }), code: String, siteId: ref('Site', { index: true }),
  area: String, mode: { type: String, enum: ['access', 'checkout', 'delivery'], default: 'access' },
  ok: Boolean, reason: String, by: ref('User'), byName: String, visitorName: String, at: { type: Date, default: Date.now, index: true },
});

const notificationSchema = new Schema({ userId: ref('User', { required: true }), type: String, title: String, body: String, link: String, read: { type: Boolean, default: false } }, { timestamps: true });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const blocklistSchema = new Schema({
  name: { type: String, default: '', trim: true, lowercase: true }, email: { type: String, default: '', trim: true, lowercase: true }, phone: { type: String, default: '', trim: true },
  reason: { type: String, default: '', maxlength: 300 }, active: { type: Boolean, default: true }, addedBy: ref('User'),
}, { timestamps: true });

const webhookSchema = new Schema({
  siteId: ref('Site'), url: { type: String, required: true, maxlength: 500 }, secret: { type: String, required: true },
  events: { type: [String], default: ['visit.checked_in', 'visit.denied'] }, format: { type: String, enum: ['json', 'slack'], default: 'json' },
  active: { type: Boolean, default: true }, lastStatus: Number, lastAt: Date,
}, { timestamps: true });

const auditSchema = new Schema({ actor: ref('User'), actorName: String, action: { type: String, index: true }, target: String, meta: Schema.Types.Mixed, at: { type: Date, default: Date.now, index: true } });

module.exports = {
  STATUS,
  Site: model('Site', siteSchema), Area: model('Area', areaSchema), User: model('User', userSchema), Visit: model('Visit', visitSchema),
  Scan: model('Scan', scanSchema), Notification: model('Notification', notificationSchema), Blocklist: model('Blocklist', blocklistSchema),
  Webhook: model('Webhook', webhookSchema), Audit: model('Audit', auditSchema),
};
