const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    phone: String,
    bloodGroup: String,
    photo: String,
    uploaderPassword: {
      type: String,
      select: false,
    },
    viewerPassword: {
      type: String,
      select: false,
    },

    // Emergency Quick Access Info
    allergies: [String],
    chronicDiseases: [String],
    currentMedications: [String],
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },

    // NFC unique ID
    nfcId: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
