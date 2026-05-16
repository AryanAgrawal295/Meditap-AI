const NfcCard = require("../models/NfcCard");
const Patient = require("../models/Patient");

exports.handleTap = async (req, res) => {
  try {
    const { cardUID } = req.body;

    const card = await NfcCard.findOne({ cardUID, isActive: true })
      .populate("patientId");

    if (!card) {
      return res.status(404).json({ message: "Invalid NFC Card" });
    }

    const patient = card.patientId;
    const today = new Date();
    const birthDate = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
    const age =
      birthDate &&
      !Number.isNaN(birthDate.getTime())
        ? today.getFullYear() -
          birthDate.getFullYear() -
          (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)
        : null;

    res.json({
      patientId: patient._id,
      name: patient.fullName,
      fullName: patient.fullName,
      email: patient.email || null,
      phone: patient.phone || null,
      age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies || [],
      emergencyContact: patient.emergencyContact || null,
      photo: patient.photo || null,
      dateOfBirth: patient.dateOfBirth || null,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
