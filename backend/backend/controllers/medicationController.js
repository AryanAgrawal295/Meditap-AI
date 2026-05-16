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
const { extractMedicinesFromImage } = require("../services/medicationAgentService");
const OCR_CONFIDENCE_THRESHOLD = Number(process.env.OCR_CONFIDENCE_THRESHOLD) || 75;

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
  const prescriptionFiles = (plan.prescriptionFiles || []).map((file) => ({
    index: file.index,
    tag: file.tag || `Prescription ${file.index || 1}`,
    fileUrl:
      buildSignedDownloadUrl({
        publicId: file.filePublicId,
        format: file.fileFormat,
        resourceType: file.fileResourceType,
        fileName: file.fileName,
      }) || file.fileUrl,
    filePublicId: file.filePublicId,
    fileName: file.fileName,
    fileResourceType: file.fileResourceType,
    fileFormat: file.fileFormat,
    uploadedAt: file.uploadedAt,
  }));
  const sourceFileUrl =
    buildSignedDownloadUrl({
      publicId: plan.sourceFilePublicId,
      format: plan.sourceFileFormat,
      resourceType: plan.sourceFileResourceType,
      fileName: plan.sourceFileName,
    }) || plan.sourceFileUrl;
  const normalizedPrescriptionFiles =
    prescriptionFiles.length > 0 || !sourceFileUrl
      ? prescriptionFiles
      : [
          {
            index: 1,
            tag: "Prescription 1",
            fileUrl: sourceFileUrl,
            filePublicId: plan.sourceFilePublicId,
            fileName: plan.sourceFileName,
            uploadedAt: plan.createdAt,
          },
        ];

  return {
    id: plan._id,
    patient: plan.patient,
    source: plan.source,
    status: plan.status || "active",
    prescriptionText: plan.prescriptionText,
    sourceFileUrl,
    sourceFilePublicId: plan.sourceFilePublicId,
    sourceFileName: plan.sourceFileName,
    sourceFileResourceType: plan.sourceFileResourceType,
    sourceFileFormat: plan.sourceFileFormat,
    prescriptionFiles: normalizedPrescriptionFiles,
    medicines: plan.medicines,
    agentTrace: plan.agentTrace,
    adherence,
    refillAlerts,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function canAccessPatient(req, patientId) {
  return !req.user?.isPatientSession || String(req.user.patientId) === String(patientId);
}

async function extractPrescriptionSchedule(file, prescriptionIndex) {
  let uploadedFile = null;

  // 1. Upload to Cloudinary
  try {
    uploadedFile = await uploadBuffer(file.buffer, {
      folder: `${process.env.CLOUDINARY_FOLDER || "meditap"}/prescriptions`,
      public_id: file.originalname?.replace(/\.[^/.]+$/, "") || undefined,
    });
  } catch (uploadError) {
    console.warn("Prescription file storage skipped:", uploadError.message);
  }

  // 2. Run AWS Textract (now returns structured result with confidence + handwriting flag)
  const textractResult = await extractText(file.buffer);
  const rawText = textractResult.fullText || "";
  const cleanedText = cleanOCRText(rawText);

  const isLowConfidence = textractResult.confidence != null && textractResult.confidence < OCR_CONFIDENCE_THRESHOLD;
  const hasHandwriting = textractResult.hasHandwriting;
  const shouldUseVision = hasHandwriting || isLowConfidence;

  let structuredMedicines;
  let extractionMethod = "text-llm";

  if (shouldUseVision) {
    // 3a. HANDWRITING PATH: Vision LLM reads the image directly
    console.log(`Handwriting detected (confidence: ${textractResult.confidence}%). Using vision extraction.`);

    const mimeType = file.mimetype || "image/jpeg";
    const visionResult = await extractMedicinesFromImage(file.buffer, mimeType);

    if (visionResult?.medicines?.length) {
      structuredMedicines = visionResult.medicines;
      extractionMethod = "vision-llm";
    } else {
      // Vision failed — fall through to text pipeline
      console.warn("Vision extraction returned empty. Falling back to text pipeline.");
      structuredMedicines = await extractStructuredMedicines(cleanedText);
    }
  } else {
    // 3b. PRINTED PATH: existing text → LLM pipeline
    structuredMedicines = await extractStructuredMedicines(cleanedText);
    extractionMethod = "text-llm";
  }

  const tag = `Prescription ${prescriptionIndex}`;
  const medicines = buildDoseTimeline(structuredMedicines).map((medicine) => ({
    ...medicine,
    prescriptionIndex,
    prescriptionTag: tag,
    sourceFileName: file.originalname,
  }));

  const prescriptionFile = {
    index: prescriptionIndex,
    tag,
    fileUrl: uploadedFile?.secure_url || null,
    filePublicId: uploadedFile?.public_id || null,
    fileName: file.originalname,
    fileResourceType: uploadedFile?.resource_type || null,
    fileFormat: uploadedFile?.format || file.originalname?.split(".").pop() || null,
  };

  return {
    rawText,
    cleanedText,
    structuredMedicines,
    medicines,
    prescriptionFile,
    extractionMethod,        // tells frontend which pipeline was used
    ocrConfidence: textractResult.confidence,
    wasHandwritten: hasHandwriting,
  };
}


exports.createPlanFromPrescription = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: "patientId is required" });
    }

    if (!canAccessPatient(req, patientId)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Prescription image is required" });
    }

    const { rawText, cleanedText, structuredMedicines, medicines, prescriptionFile } =
      await extractPrescriptionSchedule(req.file, 1);

    const plan = await MedicationPlan.create({
      patient: patientId,
      createdBy: req.user?._id,
      prescriptionText: cleanedText,
      source: "ocr",
      sourceFileUrl: prescriptionFile.fileUrl,
      sourceFilePublicId: prescriptionFile.filePublicId,
      sourceFileName: req.file.originalname,
      sourceFileResourceType: prescriptionFile.fileResourceType,
      sourceFileFormat: prescriptionFile.fileFormat,
      prescriptionFiles: [prescriptionFile],
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

exports.appendPrescriptionToPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await MedicationPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({ message: "Medication plan not found" });
    }

    if (!canAccessPatient(req, plan.patient)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Prescription image is required" });
    }

    if ((!plan.prescriptionFiles || plan.prescriptionFiles.length === 0) && (plan.sourceFileUrl || plan.sourceFileName)) {
      plan.prescriptionFiles = [
        {
          index: 1,
          tag: "Prescription 1",
          fileUrl: plan.sourceFileUrl,
          filePublicId: plan.sourceFilePublicId,
          fileName: plan.sourceFileName,
          fileResourceType: plan.sourceFileResourceType,
          fileFormat: plan.sourceFileFormat,
          uploadedAt: plan.createdAt,
        },
      ];
    }

    const existingIndexes = [
      ...(plan.prescriptionFiles || []).map((file) => Number(file.index) || 0),
      ...(plan.medicines || []).map((medicine) => Number(medicine.prescriptionIndex) || 0),
    ];
    const nextIndex = Math.max(1, ...existingIndexes) + 1;
    const { rawText, cleanedText, structuredMedicines, medicines, prescriptionFile } =
      await extractPrescriptionSchedule(req.file, nextIndex);

    plan.prescriptionText = [plan.prescriptionText, cleanedText].filter(Boolean).join("\n\n---\n\n");
    plan.prescriptionFiles.push(prescriptionFile);
    plan.medicines.push(...medicines);
    plan.agentTrace.push({
      agent: "Medicine scheduling agent",
      status: "completed",
      summary: `Added ${medicines.length} medicine(s) from ${prescriptionFile.tag}.`,
    });

    await plan.save();

    res.status(200).json({
      rawText,
      cleanedText,
      structuredMedicines,
      plan: toClientPlan(plan),
    });
  } catch (error) {
    console.error("Append prescription error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getPatientPlans = async (req, res) => {
  try {
    if (!canAccessPatient(req, req.params.patientId)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    const plans = await MedicationPlan.find({ patient: req.params.patientId }).sort({ createdAt: -1 });
    res.json(plans.map(toClientPlan));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReminderQueue = async (req, res) => {
  try {
    if (!canAccessPatient(req, req.params.patientId)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    const plans = await MedicationPlan.find({ patient: req.params.patientId }).sort({ createdAt: -1 });
    const reminders = plans
      .filter((plan) => (plan.status || "active") === "active")
      .flatMap((plan) =>
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

    if (!canAccessPatient(req, plan.patient)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    const medicine = plan.medicines.id(medicineId);
    const dose = medicine?.doses.id(doseId);

    if (!medicine || !dose) {
      return res.status(404).json({ message: "Dose not found" });
    }

    if ((plan.status || "active") === "paused") {
      return res.status(400).json({ message: "Start this schedule before verifying doses" });
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

    if (!canAccessPatient(req, plan.patient)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    const medicine = plan.medicines.id(medicineId);
    const dose = medicine?.doses.id(doseId);

    if (!medicine || !dose) {
      return res.status(404).json({ message: "Dose not found" });
    }

    if ((plan.status || "active") === "paused") {
      return res.status(400).json({ message: "Start this schedule before updating dose status" });
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

exports.updateDoseSchedule = async (req, res) => {
  try {
    const { planId, medicineId, doseId } = req.params;
    const { scheduledAt } = req.body;
    const plan = await MedicationPlan.findById(planId);

    if (!scheduledAt) {
      return res.status(400).json({ message: "scheduledAt is required" });
    }

    const nextScheduledAt = new Date(scheduledAt);

    if (Number.isNaN(nextScheduledAt.getTime())) {
      return res.status(400).json({ message: "Invalid scheduledAt value" });
    }

    if (!plan) {
      return res.status(404).json({ message: "Medication plan not found" });
    }

    if (!canAccessPatient(req, plan.patient)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    const medicine = plan.medicines.id(medicineId);
    const dose = medicine?.doses.id(doseId);

    if (!medicine || !dose) {
      return res.status(404).json({ message: "Dose not found" });
    }

    if ((plan.status || "active") === "paused") {
      return res.status(400).json({ message: "Start this schedule before rescheduling doses" });
    }

    if (!["pending", "missed"].includes(dose.status)) {
      return res.status(400).json({ message: "Only pending or missed doses can be rescheduled" });
    }

    dose.scheduledAt = nextScheduledAt;
    dose.status = "pending";
    dose.reminderLevel = 0;
    dose.missedAt = undefined;
    dose.takenAt = undefined;

    await plan.save();
    res.json(toClientPlan(plan));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const { planId, medicineId } = req.params;
    const { name } = req.body;
    const plan = await MedicationPlan.findById(planId);

    if (!String(name || "").trim()) {
      return res.status(400).json({ message: "Medicine name is required" });
    }

    if (!plan) {
      return res.status(404).json({ message: "Medication plan not found" });
    }

    if (!canAccessPatient(req, plan.patient)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    const medicine = plan.medicines.id(medicineId);

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    medicine.name = String(name).trim();

    await plan.save();
    res.json(toClientPlan(plan));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePlanStatus = async (req, res) => {
  try {
    const { planId } = req.params;
    const { status } = req.body;
    const plan = await MedicationPlan.findById(planId);

    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({ message: "Invalid schedule status" });
    }

    if (!plan) {
      return res.status(404).json({ message: "Medication plan not found" });
    }

    if (!canAccessPatient(req, plan.patient)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    plan.status = status;
    plan.agentTrace.push({
      agent: "Schedule control",
      status,
      summary: status === "paused" ? "Medication schedule paused." : "Medication schedule started.",
    });

    await plan.save();
    res.json(toClientPlan(plan));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await MedicationPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({ message: "Medication plan not found" });
    }

    if (!canAccessPatient(req, plan.patient)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    await plan.deleteOne();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
