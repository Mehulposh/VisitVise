
const router = require("express").Router();

const authController = require("../controllers/authcontroller");

const { z, email, password } = require("../utils/schemas");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { authLimiter } = require("../middleware/security");

// Register
router.post("/register",authLimiter,validate(
    z.object({
      name: z.string().trim().min(1).max(80),
      email,
      password,
      department: z.string().trim().max(60).optional(),
    })
  ),
  authController.register
);

// Login
router.post("/login",authLimiter,validate(
    z.object({
      email,
      password: z.string().min(1).max(72),
    })
  ),
  authController.login
);

// Logout
router.post("/logout", authController.logout);

// Current user
router.get("/me",authenticate, authController.getMe);

// Email verification
router.post(
  "/auth/verify-email",
  authLimiter,
  validate(
    z.object({
      token: z.string().length(64),
    })
  ),
  authController.verifyEmail
);

// Resend verification email
router.post(
  "/auth/resend-verification",
  authenticate,
  authLimiter,
  authController.resendVerification
);

// Forgot password
router.post(
  "/auth/forgot-password",
  authLimiter,
  validate(z.object({ email })),
  authController.forgotPassword
);

// Reset password
router.post(
  "/auth/reset-password",
  authLimiter,
  validate(
    z.object({
      token: z.string().length(64),
      password,
    })
  ),
  authController.resetPassword
);

// Change password
router.post(
  "/auth/change-password",
  authenticate,
  authLimiter,
  validate(
    z.object({
      currentPassword: z.string().min(1).max(72),
      newPassword: password,
    })
  ),
  authController.changePassword
);

// Update profile settings
router.patch(
  "/auth/settings",
  authenticate,
  validate(
    z.object({
      name: z.string().trim().min(1).max(80).optional(),
      phone: z.string().trim().max(25).optional(),
      department: z.string().trim().max(60).optional(),
      notifyEmail: z.boolean().optional(),
    })
  ),
  authController.updateSettings
);

// Set or remove delegate
router.put(
  "/me/delegate",
  authenticate,
  validate(
    z.object({
      email: email.nullable(),
    })
  ),
  authController.updateDelegate
);

module.exports = router;
