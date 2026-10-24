
const router = require("express").Router();

const { z, objectId } = require("../utils/schemas");
const { validate } = require("../middleware/validate");
const { authenticate, staffOnly } = require("../middleware/auth");
const { gateLimiter } = require("../middleware/security");

const {
  photoUpload,
  idUpload,
  verifyFile,
  removeFile,
} = require("../middleware/upload");

const gateController = require("../controllers/gateController");

router.use(
  ["/gate", "/scan"],
  authenticate,
  staffOnly,
  gateLimiter
);

const scanSchema = z.object({
  code: z.string().trim().min(1).max(300),
  area: z.string().trim().max(50).optional(),
  mode: z.enum(["access", "checkout"]).default("access"),
});

const idParam = validate(
  z.object({ id: objectId }),
  "params"
);

// Clean up uploaded files if file verification or later validation fails.
const cleanOnError = (middleware) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (error && req.file) {
      const bucket = req.file.destination.endsWith("ids")
        ? "ids"
        : "photos";

      removeFile(bucket, req.file.filename);
    }

    next(error);
  });
};

// Scan routes: keep the legacy URL for compatibility.
router.post(
  "/gate/scan",
  validate(scanSchema),
  gateController.scanVisitor
);

router.post(
  "/scan",
  validate(scanSchema),
  gateController.scanVisitor
);

// Delivery registration.
router.post(
  "/gate/delivery",
  validate(
    z.object({
      courier: z.string().trim().min(1).max(80),
      company: z.string().trim().max(80).optional(),
      hostId: objectId.optional(),
      note: z.string().trim().max(200).optional(),
    })
  ),
  gateController.registerDelivery
);

// Current and expected visitors.
router.get(
  "/gate/onsite",
  gateController.getOnsiteVisitors
);

router.get(
  "/gate/expected",
  validate(
    z.object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    }),
    "query"
  ),
  gateController.getExpectedVisitors
);

// Visitor photo upload.
router.post(
  "/gate/visits/:id/photo",
  idParam,
  photoUpload,
  cleanOnError(verifyFile),
  gateController.uploadVisitorPhoto
);

// ID document upload.
router.post(
  "/gate/visits/:id/id-document",
  idParam,
  idUpload,
  cleanOnError(verifyFile),
  cleanOnError(
    validate(
      z.object({
        idType: z.enum([
          "aadhaar",
          "pan",
          "driving_licence",
          "passport",
          "voter_id",
          "other",
        ]),
        idLast4: z.string().regex(/^\d{4}$/).optional(),
      })
    )
  ),
  gateController.uploadIdDocument
);

// Vehicle information.
router.patch(
  "/gate/visits/:id/vehicle",
  idParam,
  validate(
    z.object({
      plate: z.string().trim().max(15).optional(),
      type: z.string().trim().max(20).optional(),
      slot: z.string().trim().max(12).optional(),
    })
  ),
  gateController.updateVehicle
);

// Manual checkout.
router.post(
  "/gate/visits/:id/checkout",
  idParam,
  gateController.checkoutVisitor
);

// Clear a flagged declaration.
router.post(
  "/gate/visits/:id/clear-declaration",
  idParam,
  gateController.clearDeclaration
);

module.exports = router;
