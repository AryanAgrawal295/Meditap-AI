const extractText = require("../services/textractService");
const analyzeMedicalText = require("../services/textService");
const { uploadBuffer } = require("../services/cloudinaryService");
const {
  buildDoseTimeline,
  extractStructuredMedicines,
} = require("../services/medicationAgentService");

function cleanOCRText(text) {
  return text
    .replace(/[^a-zA-Z0-9\/:\n ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

exports.processPrescription = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        error: "No file uploaded",
        message: "Attach a prescription image or PDF.",
      });
    }

    const uploadedFile = await uploadBuffer(req.file.buffer, {
      folder: `${process.env.CLOUDINARY_FOLDER || "meditap"}/ocr-inputs`,
      public_id: req.file.originalname
        ? req.file.originalname.replace(/\.[^/.]+$/, "")
        : undefined,
    });

    // Step 1: OCR
    const rawText = await extractText(req.file.buffer);

    // Step 2: Clean OCR text
    const cleanedText = cleanOCRText(rawText);

    // Step 3: Medical entity extraction
    const entities = await analyzeMedicalText(cleanedText);

    // Step 4: Filter useful entities
    const importantCategories = [
      "MEDICAL_CONDITION",
      "MEDICATION",
      "TEST_TREATMENT_PROCEDURE"
    ];

    const filteredEntities = entities.filter(
      e => e.Score > 0.8 && importantCategories.includes(e.Category)
    );

    // Step 5: Create structured output
    const conditions = filteredEntities
      .filter(e => e.Category === "MEDICAL_CONDITION")
      .map(e => e.Text);

    const medications = filteredEntities
      .filter(e => e.Category === "MEDICATION")
      .map(e => e.Text);

    const procedures = filteredEntities
      .filter(e => e.Category === "TEST_TREATMENT_PROCEDURE")
      .map(e => e.Text);

    // Step 6: Agentic prescription structuring and medicine schedule preview
    const structuredMedicines = await extractStructuredMedicines(cleanedText);
    const medicineSchedule = buildDoseTimeline(structuredMedicines);

    res.json({
      fileUrl: uploadedFile.secure_url,
      rawText,
      cleanedText,
      conditions,
      medications,
      procedures,
      structuredMedicines,
      medicineSchedule
    });

  } catch (error) {
    console.error("OCR PROCESS ERROR:", error);

    res.status(500).json({
      error: "Processing failed",
      message: error.message
    });
  }
};
