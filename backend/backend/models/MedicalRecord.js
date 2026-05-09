const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    diagnosis: String,
    symptoms: String,
    prescriptions: [String],
    labReports: [String],
    notes: String,
    title: String,
    hospital: String,
    department: String,
    description: String,
    attachments: [String],
    recordType: {
      type: String,
      enum: ["consultation", "diagnosis", "lab-test", "surgery", "admission", "discharge", "emergency"],
      default: "consultation",
    },
    severity: {
      type: String,
      enum: ["normal", "critical", "emergency", "follow-up"],
      default: "normal",
    },
    tags: [String],

    visitDate: {
      type: Date,
      default: Date.now,
    },

    fileUrl: {
      type: String
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
