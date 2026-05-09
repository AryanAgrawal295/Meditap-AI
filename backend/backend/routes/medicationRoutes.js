const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const medicationController = require("../controllers/medicationController");

router.post(
  "/prescription",
  auth,
  role("doctor", "receptionist"),
  upload.single("file"),
  medicationController.createPlanFromPrescription
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
  role("doctor", "receptionist"),
  medicationController.verifyDose
);

router.patch(
  "/:planId/medicines/:medicineId/doses/:doseId/status",
  auth,
  role("doctor", "receptionist"),
  medicationController.updateDoseStatus
);

module.exports = router;
