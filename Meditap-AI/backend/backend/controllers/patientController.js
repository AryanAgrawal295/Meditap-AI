const Patient = require("../models/Patient");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createManualNfcId() {
  return `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function getPublicPatientSnapshot(patient) {
  const today = new Date();
  const birthDate = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
  const age =
    birthDate && !Number.isNaN(birthDate.getTime())
      ? today.getFullYear() -
        birthDate.getFullYear() -
        (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)
      : null;

  return {
    patientId: patient._id,
    fullName: patient.fullName,
    name: patient.fullName,
    email: patient.email || null,
    phone: patient.phone || null,
    age,
    gender: patient.gender,
    bloodGroup: patient.bloodGroup,
    allergies: patient.allergies || [],
    emergencyContact: patient.emergencyContact || null,
    photo: patient.photo || null,
    dateOfBirth: patient.dateOfBirth || null,
  };
}

// Create Patient
exports.createPatient = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.uploaderPassword) {
      payload.uploaderPassword = await bcrypt.hash(String(payload.uploaderPassword), 10);
    }

    if (payload.viewerPassword) {
      payload.viewerPassword = await bcrypt.hash(String(payload.viewerPassword), 10);
    }

    const patient = await Patient.create(payload);
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Public patient self-registration for non-NFC onboarding
exports.registerPatient = async (req, res) => {
  try {
    const {
      fullName,
      email,
      dateOfBirth,
      gender,
      phone,
      bloodGroup,
      emergencyContact = {},
      uploaderPassword,
      viewerPassword,
    } = req.body;

    if (!fullName || !email || !phone || !uploaderPassword || !viewerPassword) {
      return res.status(400).json({
        message: "Full name, email, mobile number, uploader password, and viewer password are required",
      });
    }

    if (String(uploaderPassword).length < 6 || String(viewerPassword).length < 6) {
      return res.status(400).json({ message: "Both passwords must be at least 6 characters" });
    }

    if (String(uploaderPassword) === String(viewerPassword)) {
      return res.status(400).json({ message: "Uploader and viewer passwords must be different" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingPatient = await Patient.findOne({ email: normalizedEmail });

    if (existingPatient) {
      return res.status(409).json({
        message: "A patient with this email already exists. Use Find Patient to continue.",
        patientId: existingPatient._id,
      });
    }

    const patient = await Patient.create({
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || "other",
      phone,
      bloodGroup,
      allergies: normalizeList(req.body.allergies),
      chronicDiseases: normalizeList(req.body.chronicDiseases),
      currentMedications: normalizeList(req.body.currentMedications),
      emergencyContact: {
        name: emergencyContact.name || "",
        phone: emergencyContact.phone || "",
        relation: emergencyContact.relation || "",
      },
      uploaderPassword: await bcrypt.hash(String(uploaderPassword), 10),
      viewerPassword: await bcrypt.hash(String(viewerPassword), 10),
      nfcId: createManualNfcId(),
    });

    res.status(201).json({
      patient: getPublicPatientSnapshot(patient),
      patientId: patient._id,
      fullName: patient.fullName,
      email: patient.email,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update Patient
exports.updatePatient = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.uploaderPassword) {
      payload.uploaderPassword = await bcrypt.hash(String(payload.uploaderPassword), 10);
    }

    if (payload.viewerPassword) {
      payload.viewerPassword = await bcrypt.hash(String(payload.viewerPassword), 10);
    }

    const patient = await Patient.findByIdAndUpdate(req.params.id, payload, {
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

    res.json(getPublicPatientSnapshot(patient));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Full Patient Profile
exports.getPatientById = async (req, res) => {
  try {
    if (req.user.isPatientSession && String(req.user.patientId) !== String(req.params.id)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

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

