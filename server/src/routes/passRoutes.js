
const router = require('express').Router();

const { z } = require('../utils/schemas');
const { validate } = require('../middleware/validate');
const { passLimiter } = require('../middleware/security');

const {
  getPublicPass,
  getPassQr,
  getPassPhoto,
  getPassCalendar,
  signAgreement,
  submitDeclaration,
  forgetVisitorData,
} = require('../controllers/passController');

// Public pass endpoints: access is controlled by the secret pass code.
router.use('/pass', passLimiter);

router.get('/pass/:code', getPublicPass);

router.get('/pass/:code/qr.svg', getPassQr);

router.get('/pass/:code/photo', getPassPhoto);

router.get('/pass/:code/ics', getPassCalendar);

router.post(
  '/pass/:code/agreement',
  validate(
    z.object({
      name: z.string().trim().min(2).max(80),
    })
  ),
  signAgreement
);

router.post(
  '/pass/:code/declaration',
  validate(
    z.object({
      answers: z.object({
        fever: z.boolean(),
        cough: z.boolean(),
        closeContact: z.boolean(),
        recentTravel: z.boolean(),
      }),
    })
  ),
  submitDeclaration
);

router.post('/pass/:code/forget', forgetVisitorData);

module.exports = router;
