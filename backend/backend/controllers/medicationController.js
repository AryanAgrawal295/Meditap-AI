const MedicationPlan = require("../models/MedicationPlan");
const extractText = require("../services/textractService");
const { buildSignedDownloadUrl, uploadBuffer } = require("../services/cloudinaryService");
const {
  buildDoseTimeline,
  extractStructuredMedicines,
  getReminderLevel,
  summarizeAdherence,
  verifyIntakeEvidence,
} = require("../services/medicationAgentService");

function cleanOCRText(text = "") {
  return text
    .replace(/[^a-zA-Z0-9/:\n .,-]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toClientPlan(plan) {
  const adherence = summarizeAdherence(plan);
  const refillAlerts = plan.medicines
    .filter((medicine) => medicine.refillReminderAt)
    .map((medicine) => ({
      medicineId: medicine._id,
      medicineName: medicine.name,
      refillReminderAt: medicine.refillReminderAt,
      stockQuantity: medicine.stockQuantity,
    }));

  return {
    id: plan._id,
    patient: plan.patient,
    source: plan.source,
    prescriptionText: plan.prescriptionText,
    sourceFileUrl:
      buildSignedDownloadUrl({
        publicId: plan.sourceFilePublicId,
        format: plan.sourceFileFormat,
        resourceType: plan.sourceFileResourceType,
        fileName: plan.sourceFileName,
      }) || plan.sourceFileUrl,
    sourceFilePublicId: plan.sourceFilePublicId,
    sourceFileName: plan.sourceFileName,
    medicines: plan.medicines,
    agentTrace: plan.agentTrace,
    adherence,
    refillAlerts,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

exports.createPlanFromPrescription = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: "patientId is required" });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Prescription image is required" });
    }

    const uploadedFile = await uploadBuffer(req.file.buffer, {
      folder: `${process.env.CLOUDINARY_FOLDER || "meditap"}/prescriptions`,
      public_id: req.file.originalname
        ? req.file.originalname.replace(/\.[^/.]+$/, "")
        : undefined,
    });

    const rawText = await extractText(req.file.buffer);
    const cleanedText = cleanOCRText(rawText);
    const structuredMedicines = await extractStructuredMedicines(cleanedText);
    const medicines = buildDoseTimeline(structuredMedicines);

    const plan = await MedicationPlan.create({
      patient: patientId,
      createdBy: req.user?._id,
      prescriptionText: cleanedText,
      source: "ocr",
      sourceFileUrl: uploadedFile.secure_url,
      sourceFilePublicId: uploadedFile.public_id,
      sourceFileName: req.file.originalname,
      sourceFileResourceType: uploadedFile.resource_type,
      sourceFileFormat: uploadedFile.format || req.file.originalname?.split(".").pop() || null,
      medicines,
      agentTrace: [
        {
          agent: "OCR processing agent",
          status: "completed",
          summary: "Extracted prescription text from uploaded image.",
        },
        {
          agent: "Medicine scheduling agent",
          status: "completed",
          summary: `Created schedule for ${medicines.length} medicine(s).`,
        },
        {
          agent: "Reminder management agent",
          status: "ready",
          summary: "Reminder escalation is calculated from each pending dose time.",
        },
        {
          agent: "Adherence monitoring agent",
          status: "ready",
          summary: "Dose statuses will update adherence history.",
        },
      ],
    });

    res.status(201).json({
      rawText,
      cleanedText,
      structuredMedicines,
      plan: toClientPlan(plan),
    });
  } catch (error) {
    console.error("Create medication plan error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getPatientPlans = async (req, res) => {
  try {
    const plans = await MedicationPlan.find({ patient: req.params.patientId }).sort({ createdAt: -1 });
    res.json(plans.map(toClientPlan));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReminderQueue = async (req, res) => {
  try {
    const plans = await MedicationPlan.find({ patient: req.params.patientId }).sort({ createdAt: -1 });
    const reminders = plans.flatMap((plan) =>
      plan.medicines.flatMap((medicine) =>
        medicine.doses
          .filter((dose) => dose.status === "pending")
          .map((dose) => ({
            planId: plan._id,
            medicineId: medicine._id,
            medicineName: medicine.name,
            dosage: medicine.dosage,
            doseId: dose._id,
            scheduledAt: dose.scheduledAt,
            timingLabel: dose.timingLabel,
            reminderLevel: getReminderLevel(dose),
            caretakerNotification: getReminderLevel(dose) >= 4,
          }))
      )
    );

    res.json(reminders.filter((item) => item.reminderLevel > 0));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyDose = async (req, res) => {
  try {
    const { planId, medicineId, doseId } = req.params;
    const plan = await MedicationPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({ message: "Medication plan not found" });
    }

    const medicine = plan.medicines.id(medicineId);
    const dose = medicine?.doses.id(doseId);

    if (!medicine || !dose) {
      return res.status(404).json({ message: "Dose not found" });
    }

    const verification = verifyIntakeEvidence(req.body);

    if (verification.verified) {
      dose.status = "taken";
      dose.verifiedByAI = true;
      dose.takenAt = new Date();
      dose.verificationNotes = verification.notes;
    } else {
      dose.reminderLevel = Math.min(4, Math.max(dose.reminderLevel || 0, getReminderLevel(dose), 1) + 1);
      dose.verificationNotes = verification.notes;
    }

    await plan.save();
    res.json({ verification, plan: toClientPlan(plan) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDoseStatus = async (req, res) => {
  try {
    const { planId, medicineId, doseId } = req.params;
    const { status } = req.body;
    const plan = await MedicationPlan.findById(planId);

    if (!["pending", "taken", "missed"].includes(status)) {
      return res.status(400).json({ message: "Invalid dose status" });
    }

    if (!plan) {
      return res.status(404).json({ message: "Medication plan not found" });
    }

    const medicine = plan.medicines.id(medicineId);
    const dose = medicine?.doses.id(doseId);

    if (!medicine || !dose) {
      return res.status(404).json({ message: "Dose not found" });
    }

    dose.status = status;
    dose.takenAt = status === "taken" ? new Date() : undefined;
    dose.missedAt = status === "missed" ? new Date() : undefined;

    await plan.save();
    res.json(toClientPlan(plan));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
