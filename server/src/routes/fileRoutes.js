
const router = require("express").Router();

const { authenticate } = require("../middleware/auth");
const fileController = require("../controllers/fileController");

router.get(
  "/files/:bucket/:name",
  authenticate,
  fileController.downloadFile
);

module.exports = router;
