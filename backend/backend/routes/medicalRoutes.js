const express = require("express");
const router = express.Router();
const {
  addMedicalRecord,
  getPatientTimeline,
} = require("../controllers/medicalController");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const logAccess = require("../middleware/logMiddleware");
const upload = require("../middleware/uploadMiddleware");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");





// Only doctor can add record
router.post(
  "/",
  auth,
  role("doctor"),
  addMedicalRecord
);

// Doctor & emergency can view timeline
router.get(
  "/:patientId",
  auth,
  role("doctor", "receptionist", "emergency"),
  logAccess("VIEW_TIMELINE"),
  getPatientTimeline
);

router.post(
  "/upload-report/:patientId",
  auth,
  role("doctor"),
  upload.single("report"),
  async (req, res) => {
    const { patientId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const record = await MedicalRecord.create({
      patient: patientId,
      fileUrl: req.file.path,
    });

    res.json({
      message: "Report uploaded",
      record,
    });
  }
);

// Secure report access
router.get(
  "/report/:recordId",
  auth,
  role("doctor", "emergency"),
  logAccess("VIEW_REPORT"),
  async (req, res) => {
    try {
      const record = await MedicalRecord.findById(req.params.recordId);

      if (!record || !record.fileUrl) {
        return res.status(404).json({ message: "Report not found" });
      }

      const filePath = path.resolve(record.fileUrl);
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


module.exports = router;
