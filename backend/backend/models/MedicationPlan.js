const mongoose = require("mongoose");

const medicineDoseSchema = new mongoose.Schema(
  {
    scheduledAt: {
      type: Date,
      required: true,
    },
    timingLabel: String,
    status: {
      type: String,
      enum: ["pending", "taken", "missed"],
      default: "pending",
    },
    reminderLevel: {
      type: Number,
      min: 0,
      max: 4,
      default: 0,
    },
    verifiedByAI: {
      type: Boolean,
      default: false,
    },
    verificationNotes: String,
    takenAt: Date,
    missedAt: Date,
  },
  { _id: true }
);

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: String,
    timing: [String],
    duration: String,
    durationDays: {
      type: Number,
      default: 7,
    },
    frequency: String,
    frequencyPerDay: {
      type: Number,
      default: 1,
    },
    quantityPerDose: {
      type: Number,
      default: 1,
    },
    stockQuantity: {
      type: Number,
      default: 0,
    },
    refillReminderAt: Date,
    doses: [medicineDoseSchema],
  },
  { _id: true }
);

const medicationPlanSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    prescriptionText: String,
    source: {
      type: String,
      enum: ["ocr", "manual", "import"],
      default: "ocr",
    },
    medicines: [medicineSchema],
    agentTrace: [
      {
        agent: String,
        status: String,
        summary: String,
        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MedicationPlan", medicationPlanSchema);
