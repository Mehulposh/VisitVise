
const router = require("express").Router();

const { authenticate } = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

// All notification endpoints require authentication.
router.use("/notifications", authenticate);

router.get(
  "/notifications",
  notificationController.getNotifications
);

router.get(
  "/notifications/unread-count",
  notificationController.getUnreadCount
);

router.post(
  "/notifications/read-all",
  notificationController.markAllAsRead
);

router.post(
  "/notifications/:id/read",
  notificationController.markAsRead
);

module.exports = router;
