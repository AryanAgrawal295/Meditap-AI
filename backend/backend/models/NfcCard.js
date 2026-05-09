const mongoose = require("mongoose");

const nfcCardSchema = new mongoose.Schema({
  cardUID: {
    type: String,
    required: true,
    unique: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("NfcCard", nfcCardSchema);
