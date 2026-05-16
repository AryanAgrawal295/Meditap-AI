const MedicalRecord = require("../models/MedicalRecord");
const { buildSignedDownloadUrl } = require("../services/cloudinaryService");

function serializeAttachment(attachment) {
  if (!attachment) {
    return null;
  }

  if (typeof attachment === "string") {
    return {
      accessUrl: attachment,
      fileName: null,
      mimeType: null,
    };
  }

  return {
    publicId: attachment.publicId || null,
    fileName: attachment.fileName || null,
    mimeType: attachment.mimeType || null,
    resourceType: attachment.resourceType || null,
    format: attachment.format || null,
    accessUrl:
      buildSignedDownloadUrl({
        publicId: attachment.publicId,
        format: attachment.format,
        resourceType: attachment.resourceType,
        fileName: attachment.fileName,
      }) || attachment.url || null,
  };
}

function serializeMedicalRecord(record) {
  const plainRecord = record.toObject ? record.toObject() : record;

  return {
    ...plainRecord,
    attachments: Array.isArray(plainRecord.attachments)
      ? plainRecord.attachments.map(serializeAttachment).filter(Boolean)
      : [],
    fileUrl:
      plainRecord.filePublicId
        ? buildSignedDownloadUrl({
            publicId: plainRecord.filePublicId,
            format: plainRecord.fileFormat,
            resourceType: plainRecord.fileResourceType,
            fileName: plainRecord.fileName,
          }) || plainRecord.fileUrl
        : plainRecord.fileUrl,
  };
}

// Add Visit Record
exports.addMedicalRecord = async (req, res) => {
  try {
    if (req.user.isPatientSession && String(req.user.patientId) !== String(req.body.patient)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    const record = await MedicalRecord.create({
      ...req.body,
      doctor: req.user._id,
      visitDate: req.body.visitDate || req.body.date || req.body.visitDate,
    });

    const populatedRecord = await MedicalRecord.findById(record._id).populate("doctor", "name role");
    res.status(201).json(serializeMedicalRecord(populatedRecord));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Timeline
exports.getPatientTimeline = async (req, res) => {
  try {
    if (req.user.isPatientSession && String(req.user.patientId) !== String(req.params.patientId)) {
      return res.status(403).json({ message: "Access denied for this patient" });
    }

    const records = await MedicalRecord.find({
      patient: req.params.patientId,
    })
      .populate("doctor", "name role")
      .sort({ visitDate: -1 });

    res.json(records.map(serializeMedicalRecord));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
