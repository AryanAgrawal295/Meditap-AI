const mongoose = require("mongoose");

const accessLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },
    role: String,
    action: String, // VIEW, CREATE, UPDATE, ADD_RECORD
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccessLog", accessLogSchema);
