const express = require("express");
const router = express.Router();
const {
  createPatient,
  getPatientByNfc,
  getPatientById,
  resolvePatient,
  updatePatient,
} = require("../controllers/patientController");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

// Only receptionist or doctor can create patient
router.post("/", auth, role("doctor", "receptionist"), createPatient);

// NFC Quick Access
router.get("/nfc/:nfcId", auth, getPatientByNfc);

// Local testing / non-NFC patient resolution
router.post("/resolve", resolvePatient);

// Full profile
router.get("/:id", auth, getPatientById);
router.put("/:id", auth, role("doctor"), updatePatient);

module.exports = router;
