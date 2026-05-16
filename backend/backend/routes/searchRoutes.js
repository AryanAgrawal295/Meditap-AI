const express = require("express");
const router = express.Router();
const { globalSearch } = require("../controllers/searchController");
const auth = require("../middleware/authMiddleware");

// Global search - requires authentication
router.get("/", auth, globalSearch);

module.exports = router;
