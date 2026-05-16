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

router.post(
  "/prescription/import",
  auth,
  role("doctor"),
  medicationController.importPrescriptionToPlan
);

router.post(
  "/:planId/prescription/import",
  auth,
  role("doctor"),
  medicationController.importPrescriptionToPlan
);

router.delete(
  "/:planId/prescriptions/:prescriptionIndex",
  auth,
  role("doctor"),
  medicationController.deletePrescriptionFromPlan
);

router.delete(
  "/plans/:planId/prescriptions/:prescriptionIndex",
  auth,
  role("doctor"),
  medicationController.deletePrescriptionFromPlan
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

router.patch(
  "/plans/:planId/status",
  auth,
  role("doctor"),
  medicationController.updatePlanStatus
);

router.delete(
  "/plans/:planId",
  auth,
  role("doctor"),
  medicationController.deletePlan
);

router.post(
  "/:planId/medicines/:medicineId/doses/:doseId/verify",
  auth,
  role("doctor"),
  medicationController.verifyDose
);

router.patch(
  "/:planId/medicines/:medicineId",
  auth,
  role("doctor"),
  medicationController.updateMedicine
);

router.patch(
  "/:planId/medicines/:medicineId/doses/:doseId/status",
  auth,
  role("doctor"),
  medicationController.updateDoseStatus
);

router.patch(
  "/:planId/medicines/:medicineId/doses/:doseId/schedule",
  auth,
  role("doctor"),
  medicationController.updateDoseSchedule
);

module.exports = router;
