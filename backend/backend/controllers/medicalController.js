const MedicalRecord = require("../models/MedicalRecord");

// Add Visit Record
exports.addMedicalRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.create({
      ...req.body,
      doctor: req.user._id,
      visitDate: req.body.visitDate || req.body.date || req.body.visitDate,
    });

    const populatedRecord = await MedicalRecord.findById(record._id).populate("doctor", "name role");
    res.status(201).json(populatedRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Timeline
exports.getPatientTimeline = async (req, res) => {
  try {
    const records = await MedicalRecord.find({
      patient: req.params.patientId,
    })
      .populate("doctor", "name role")
      .sort({ visitDate: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
