const express = require("express");
const router = express.Router();
const { handleTap } = require("../controllers/nfcController");

router.post("/tap", handleTap);

module.exports = router;
