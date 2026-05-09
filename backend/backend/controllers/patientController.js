const Patient = require("../models/Patient");
const mongoose = require("mongoose");

// Create Patient
exports.createPatient = async (req, res) => {
  try {
    const patient = await Patient.create(req.body);
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update Patient
exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json(patient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Patient by NFC ID (For NFC Tap Flow)
exports.getPatientByNfc = async (req, res) => {
  try {
    const patient = await Patient.findOne({ nfcId: req.params.nfcId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resolve patient by email or patient ID for non-NFC local flows
exports.resolvePatient = async (req, res) => {
  try {
    const rawValue = String(req.body?.email || req.body?.identifier || "").trim();

    if (!rawValue) {
      return res.status(400).json({ message: "Patient email or ID is required" });
    }

    const normalizedEmail = rawValue.toLowerCase();
    const query = mongoose.Types.ObjectId.isValid(rawValue)
      ? {
          $or: [{ email: normalizedEmail }, { _id: rawValue }],
        }
      : { email: normalizedEmail };

    const patient = await Patient.findOne(query);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json({
      patientId: patient._id,
      fullName: patient.fullName,
      email: patient.email || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Full Patient Profile
exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Emergency restricted view
    if (req.user.role === "emergency") {
      return res.json({
        fullName: patient.fullName,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
        chronicDiseases: patient.chronicDiseases,
        currentMedications: patient.currentMedications,
        emergencyContact: patient.emergencyContact,
      });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

