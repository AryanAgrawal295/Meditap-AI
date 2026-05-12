const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const medicationController = require("../controllers/medicationController");

router.post(
  "/prescription",
  auth,
  role("doctor"),
  upload.single("file"),
  medicationController.createPlanFromPrescription
);

router.post(
  "/:planId/prescription",
  auth,
  role("doctor"),
  upload.single("file"),
  medicationController.appendPrescriptionToPlan
);

router.get(
  "/:patientId",
  auth,
  role("doctor", "receptionist", "emergency"),
  medicationController.getPatientPlans
);

router.get(
  "/:patientId/reminders",
  auth,
  role("doctor", "receptionist", "emergency"),
  medicationController.getReminderQueue
);

router.post(
  "/:planId/medicines/:medicineId/doses/:doseId/verify",
  auth,
  role("doctor"),
  medicationController.verifyDose
);

router.patch(
  "/:planId/medicines/:medicineId/doses/:doseId/status",
  auth,
  role("doctor"),
  medicationController.updateDoseStatus
);

module.exports = router;
