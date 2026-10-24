
const router = require('express').Router();

const {
  z,
  objectId,
  email,
  phone,
} = require('../utils/schemas');

const { validate } = require('../middleware/validate');

const {
  kioskGuard,
  walkinLimiter,
} = require('../middleware/security');

const {
  photoUpload,
  verifyFile,
  removeFile,
} = require('../middleware/upload');

const {
  getWalkInHosts,
  createWalkIn,
  getApprovalDetails,
  submitApprovalDecision,
} = require('../controllers/walkinController');

// The kiosk device guard applies only to kiosk endpoints.
// Emailed approval links are rate-limited but do not require login.
router.use('/walkin', kioskGuard, walkinLimiter);
router.use('/approvals', walkinLimiter);

const walkinSchema = z.object({
  visitorName: z.string().trim().min(1).max(80),
  company: z.string().trim().max(80).default(''),
  email: z.union([z.literal(''), email]).default(''),
  phone: z.union([z.literal(''), phone]).default(''),
  purpose: z.string().trim().max(40).default('Meeting'),
  hostId: objectId,
  consent: z.union([
    z.literal(true),
    z.enum(['true', 'on', '1']),
  ]),
});

// Remove the uploaded photo if file verification or validation fails.
const cleanOnError = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (err && req.file) {
      removeFile('photos', req.file.filename);
    }

    next(err);
  });
};

// Search for hosts at the kiosk.
router.get(
  '/walkin/hosts',
  validate(
    z.object({
      q: z.string().trim().min(2).max(40),
    }),
    'query'
  ),
  getWalkInHosts
);

// Register a walk-in visitor and upload an optional photo.
router.post(
  '/walkin',
  photoUpload,
  cleanOnError(verifyFile),
  cleanOnError(validate(walkinSchema)),
  createWalkIn
);

// Display the details needed to approve or deny a walk-in.
router.get(
  '/approvals/:id/:token',
  getApprovalDetails
);

// Submit the host's approval decision through the emailed link.
router.post(
  '/approvals/:id/:token',
  validate(
    z.object({
      decision: z.enum(['approve', 'deny']),
    })
  ),
  submitApprovalDecision
);

module.exports = router;
