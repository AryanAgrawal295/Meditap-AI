const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const MedicationPlan = require("../models/MedicationPlan");
const aiService = require("../services/aiService");

exports.askAssistant = async (req, res) => {
  try {
    const { patientId, question, ocrContext } = req.body;

    if (!patientId || !question) {
      return res.status(400).json({ error: "patientId and question are required." });
    }

    // 1. Fetch Patient Profile
    const patientProfile = await Patient.findById(patientId);
    if (!patientProfile) {
      return res.status(404).json({ error: "Patient not found." });
    }

    // 2. Fetch all medical records for timeline context
    const medicalHistory = await MedicalRecord.find({ patient: patientId })
      .populate("doctor", "name role") // Just get basic doctor info to include in context if needed
      .sort({ visitDate: -1 }) // Sort from newest to oldest
      .lean(); // Use lean for faster simple JS objects

    const medicationPlans = await MedicationPlan.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .lean();

    // 3. Ask AI Service
    // The aiService will construct a strict prompt with this data
    const answer = await aiService.generateMedicalResponse(
      patientProfile,
      medicalHistory,
      question,
      ocrContext,
      medicationPlans
    );

    // 4. Return successful answer
    res.json({ answer });

  } catch (error) {
    console.error("AI Assistant Controller Error:", error);
    res.status(500).json({ 
      error: "Failed to process AI query",
      message: error.message
    });
  }
};
