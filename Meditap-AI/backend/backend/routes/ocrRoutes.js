const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const { processPrescription } = require("../controllers/ocrController");

// MAIN ROUTE
router.post("/process", upload.single("file"), processPrescription);

module.exports = router;