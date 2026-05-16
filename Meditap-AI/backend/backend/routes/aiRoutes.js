const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const aiController = require("../controllers/aiController");

// Use the controller for managing AI Assistant queries
router.post("/", auth, role("doctor", "receptionist"), aiController.askAssistant);

module.exports = router;
