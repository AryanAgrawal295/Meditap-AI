const express = require("express");
const router = express.Router();
const MedicalRecord = require("../models/MedicalRecord");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.get("/:patientId", auth, role("doctor"), async (req, res) => {
  try {
    const records = await MedicalRecord.find({
      patient: req.params.patientId,
    });

    const totalVisits = records.length;

    const lastVisit =
      records.length > 0
        ? records.sort((a, b) => b.visitDate - a.visitDate)[0].visitDate
        : null;

    const diagnosisCount = {};
    records.forEach((r) => {
      diagnosisCount[r.diagnosis] =
        (diagnosisCount[r.diagnosis] || 0) + 1;
    });

    res.json({
      totalVisits,
      lastVisit,
      diagnosisStats: diagnosisCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
