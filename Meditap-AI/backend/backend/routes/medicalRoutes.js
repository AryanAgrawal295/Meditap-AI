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
const { buildSignedDownloadUrl, uploadBuffer } = require("../services/cloudinaryService");
const path = require("path");
const MedicalRecord = require("../models/MedicalRecord");





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
    try {
      const { patientId } = req.params;

      if (req.user.isPatientSession && String(req.user.patientId) !== String(patientId)) {
        return res.status(403).json({ message: "Access denied for this patient" });
      }

      if (!req.file?.buffer) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const uploadedFile = await uploadBuffer(req.file.buffer, {
        folder: `${process.env.CLOUDINARY_FOLDER || "meditap"}/medical-reports`,
        public_id: req.file.originalname
          ? req.file.originalname.replace(/\.[^/.]+$/, "")
          : undefined,
      });

      res.json({
        message: "Report uploaded",
        file: {
          publicId: uploadedFile.public_id,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          resourceType: uploadedFile.resource_type,
          format: uploadedFile.format || req.file.originalname?.split(".").pop() || null,
          accessUrl: buildSignedDownloadUrl({
            publicId: uploadedFile.public_id,
            resourceType: uploadedFile.resource_type,
            format: uploadedFile.format || req.file.originalname?.split(".").pop() || null,
            fileName: req.file.originalname,
          }),
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
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

      if (req.user.isPatientSession && String(req.user.patientId) !== String(record.patient)) {
        return res.status(403).json({ message: "Access denied for this patient" });
      }

      if (record.filePublicId) {
        const signedUrl = buildSignedDownloadUrl({
          publicId: record.filePublicId,
          resourceType: record.fileResourceType,
          format: record.fileFormat,
          fileName: record.fileName,
        });

        if (!signedUrl) {
          return res.status(404).json({ message: "Signed file URL not available" });
        }

        return res.redirect(signedUrl);
      }

      if (/^https?:\/\//i.test(record.fileUrl)) {
        return res.redirect(record.fileUrl);
      }

      const filePath = path.resolve(record.fileUrl);
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


module.exports = router;
