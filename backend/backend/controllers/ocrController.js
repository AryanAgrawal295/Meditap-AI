const extractText = require("../services/textractService");
const analyzeMedicalText = require("../services/textService");
const { uploadBuffer } = require("../services/cloudinaryService");
const {
  buildDoseTimeline,
  extractRecordSuggestions,
  extractStructuredMedicines,
} = require("../services/medicationAgentService");
const { extractMedicinesFromImage } = require("../services/medicationAgentService");

function cleanOCRText(text) {
  return text
    .replace(/[^a-zA-Z0-9\/:.,\-\n ]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

exports.processPrescription = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let uploadedFile = null;
    try {
      uploadedFile = await uploadBuffer(req.file.buffer, {
        folder: `${process.env.CLOUDINARY_FOLDER || "meditap"}/ocr-inputs`,
        public_id: req.file.originalname?.replace(/\.[^/.]+$/, "") || undefined,
      });
    } catch (uploadError) {
      console.warn("OCR file storage skipped:", uploadError.message);
    }

    // Step 1: Textract (now returns confidence + handwriting flag)
    const textractResult = await extractText(req.file.buffer);
    const rawText = textractResult.fullText || "";
    const cleanedText = cleanOCRText(rawText);

    const shouldUseVision = textractResult.hasHandwriting ||
      (textractResult.confidence != null && textractResult.confidence < 75);

    // Step 2: Medical entities (Comprehend Medical — still useful even for handwriting)
    const entities = await analyzeMedicalText(cleanedText || "prescription");
    const importantCategories = ["MEDICAL_CONDITION", "MEDICATION", "TEST_TREATMENT_PROCEDURE"];
    const filteredEntities = entities.filter(
      (e) => e.Score > 0.8 && importantCategories.includes(e.Category)
    );
    const conditions = filteredEntities.filter((e) => e.Category === "MEDICAL_CONDITION").map((e) => e.Text);
    const medications = filteredEntities.filter((e) => e.Category === "MEDICATION").map((e) => e.Text);
    const procedures = filteredEntities.filter((e) => e.Category === "TEST_TREATMENT_PROCEDURE").map((e) => e.Text);

    // Step 3: Structured medicine extraction
    let structuredMedicines;
    let extractionMethod = "text-llm";

    if (shouldUseVision) {
      const visionResult = await extractMedicinesFromImage(req.file.buffer, req.file.mimetype);
      if (visionResult?.medicines?.length) {
        structuredMedicines = visionResult.medicines;
        extractionMethod = "vision-llm";
      } else {
        structuredMedicines = await extractStructuredMedicines(cleanedText);
      }
    } else {
      structuredMedicines = await extractStructuredMedicines(cleanedText);
    }

    const medicineSchedule = buildDoseTimeline(structuredMedicines);
    const recordSuggestions = await extractRecordSuggestions(cleanedText, { conditions, medications, procedures });

    res.json({
      fileUrl: uploadedFile?.secure_url || null,
      rawText,
      cleanedText,
      conditions,
      medications,
      procedures,
      recordSuggestions,
      structuredMedicines,
      medicineSchedule,
      extractionMethod,             // "vision-llm" or "text-llm"
      ocrConfidence: textractResult.confidence,
      wasHandwritten: textractResult.hasHandwriting,
    });

  } catch (error) {
    console.error("OCR PROCESS ERROR:", error);
    res.status(500).json({ error: "Processing failed", message: error.message });
  }
};
