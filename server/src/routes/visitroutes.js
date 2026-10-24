
const router = require('express').Router();

const {
  STATUS,
} = require('../models');

const {
  z,
  objectId,
  email,
  dateStr,
  hhmm,
  phone,
} = require('../utils/schemas');

const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/security');

const {
  createSingleOrRecurringVisit,
  createGroupVisit,
  getVisits,
  suggestVisitors,
  getVisitById,
  updateVisit,
  resendVisitPass,
  decideWalkInVisit,
  getVisitCalendar,
} = require('../controllers/visitcontroller');

// Validation schemas
const optStr = (n) => z.string().trim().max(n);

const vehicle = z.object({
  plate: optStr(15).default(''),
  type: optStr(20).default(''),
});

const fields = {
  company: optStr(80),
  email: z.union([z.literal(''), email]),
  phone: z.union([z.literal(''), phone]),
  purpose: optStr(40),
  date: dateStr,
  endDate: dateStr,
  from: hhmm,
  to: hhmm,
  areas: z.array(
    z.string().trim().min(1).max(50)
  ).min(1).max(20),
  notes: optStr(500),
  vehicle,
  notifyVia: z.array(
    z.enum(['email', 'sms', 'whatsapp'])
  ).max(3),
};

const visitor = z.object({
  visitorName: z.string().trim().min(1).max(80),
  company: fields.company.default(''),
  email: fields.email.default(''),
  phone: fields.phone.default(''),
});

const common = z.object({
  purpose: fields.purpose.default('Meeting'),
  date: fields.date,
  endDate: fields.endDate.optional(),
  from: fields.from,
  to: fields.to,
  areas: fields.areas,
  notes: fields.notes.default(''),
  vehicle: vehicle.optional(),
  notifyVia: fields.notifyVia.default(['email']),
});

const createSchema = visitor.merge(common).extend({
  repeat: z.object({
    weekdays: z.array(
      z.number().int().min(0).max(6)
    ).max(7).default([]),
    until: dateStr,
  }).optional(),
});

const groupSchema = common.extend({
  visitors: z.array(visitor).min(1).max(50),
});

const patchSchema = z.object({
  status: z.enum(['cancelled', 'checked_out']),
}).partial().merge(
  z.object({
    visitorName: z.string().trim().min(1).max(80),
    ...fields,
  }).partial()
);

const listSchema = z.object({
  q: z.string().trim().max(60).optional(),
  status: z.enum(STATUS).optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const idParam = validate(
  z.object({ id: objectId }),
  'params'
);

// This router is mounted before public pass and walk-in routers.
// Only these paths require authentication.
router.use(['/visits', '/visitors'], authenticate);

// Create a single visit or recurring visit series.
router.post(
  '/visits',
  writeLimiter,
  validate(createSchema),
  createSingleOrRecurringVisit
);

// Create a group invitation.
router.post(
  '/visits/group',
  writeLimiter,
  validate(groupSchema),
  createGroupVisit
);

// List visits with search, filters, and optional pagination.
router.get(
  '/visits',
  validate(listSchema, 'query'),
  getVisits
);

// Returning-visitor autocomplete.
router.get(
  '/visitors/suggest',
  validate(
    z.object({
      q: z.string().trim().min(2).max(40),
    }),
    'query'
  ),
  suggestVisitors
);

// Get visit details and recent scans.
router.get(
  '/visits/:id',
  idParam,
  getVisitById
);

// Edit, cancel, or manually check out a visit.
router.patch(
  '/visits/:id',
  idParam,
  writeLimiter,
  validate(patchSchema),
  updateVisit
);

// Resend a visitor's pass.
router.post(
  '/visits/:id/resend',
  idParam,
  resendVisitPass
);

// Approve or deny a walk-in.
router.post(
  '/visits/:id/decision',
  idParam,
  validate(
    z.object({
      decision: z.enum(['approve', 'deny']),
      areas: z.array(
        z.string().trim().min(1).max(50)
      ).min(1).max(20).optional(),
    })
  ),
  decideWalkInVisit
);

// Download the visit's calendar event.
router.get(
  '/visits/:id/ics',
  idParam,
  getVisitCalendar
);

module.exports = router;
