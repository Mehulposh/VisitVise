
const router = require("express").Router();

const adminController = require("../controllers/admincontroller");

const { authenticate, adminOnly } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { z, objectId, email, password, phone } = require("../utils/schemas");

const idParam = validate(
  z.object({ id: objectId }),
  "params"
);

// All admin endpoints require authentication and admin access.
router.use("/admin", authenticate, adminOnly);

router.get(
  "/admin/data",
  adminController.getDashboardData
);

router.get(
  "/admin/users",
  adminController.getUsers
);

router.post(
  "/admin/users",
  validate(
    z.object({
      name: z.string().trim().min(1).max(80),
      email,
      role: z.enum(["user", "security", "admin"]).default("user"),
      department: z.string().trim().max(60).optional(),
      phone: phone.optional(),
      siteId: objectId.optional(),
      password: password.optional(),
    })
  ),
  adminController.createUser
);

// Add the remaining routes here.

module.exports = router;
