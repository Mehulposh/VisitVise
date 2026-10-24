
const router = require("express").Router();

const { authenticate } = require("../middleware/auth");
const eventsController = require("../controllers/eventsController");

router.get(
  "/events",
  authenticate,
  eventsController.streamEvents
);

module.exports = router;
