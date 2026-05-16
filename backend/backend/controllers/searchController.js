const mongoose = require("mongoose");
const MedicalRecord = require("../models/MedicalRecord");
const MedicationPlan = require("../models/MedicationPlan");
const Patient = require("../models/Patient");

/**
 * Global search across all patient data
 * Searches in: medical records, medications, patient info
 * Returns results with context and location information
 */
async function globalSearch(req, res) {
  try {
    const { query, patientId, limit = 50 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: "Query must be at least 2 characters" });
    }

    const searchPatientId = patientId || req.user?.patientId || null;
    const canSearchAllPatients = !searchPatientId && ["doctor", "admin"].includes(req.user?.role);

    if (!searchPatientId && !canSearchAllPatients) {
      return res.json({
        query,
        totalResults: 0,
        results: [],
        message: "Please select a patient first to search their data",
      });
    }

    // Verify user has access to this patient when a specific patient was requested.
    if (searchPatientId && req.user?.patientId && String(req.user.patientId) !== String(searchPatientId)) {
      if (req.user.role !== "doctor" && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const searchRegex = { $regex: query, $options: "i" };
    const results = [];
    const safePatientId = searchPatientId && mongoose.Types.ObjectId.isValid(String(searchPatientId))
      ? new mongoose.Types.ObjectId(String(searchPatientId))
      : null;

    if (searchPatientId && !safePatientId) {
      return res.status(400).json({ message: "Invalid patient ID" });
    }

    console.log(`Searching for: "${query}" ${searchPatientId ? `in patient: ${searchPatientId}` : "across all accessible patients"}`);

    // Search in medical records
    const medicalRecordQuery = {
      $or: [
        { diagnosis: searchRegex },
        { notes: searchRegex },
        { description: searchRegex },
        { title: searchRegex },
        { doctorName: searchRegex },
        { hospital: searchRegex },
        { department: searchRegex },
        { symptoms: searchRegex },
        { tags: searchRegex },
      ],
    };

    if (safePatientId) {
      medicalRecordQuery.patient = safePatientId;
    }

    const medicalRecords = await MedicalRecord.find(
      medicalRecordQuery,
      {
        _id: 1,
        patient: 1,
        title: 1,
        diagnosis: 1,
        notes: 1,
        description: 1,
        recordType: 1,
        visitDate: 1,
        doctor: 1,
        doctorName: 1,
        hospital: 1,
        tags: 1,
      }
    ).limit(parseInt(limit));

    medicalRecords.forEach((record) => {
      // Find which fields contain the search term
      const fieldsMatch = [];
      const matchContext = {};

      if (record.diagnosis?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("diagnosis");
        matchContext.diagnosis = record.diagnosis;
      }
      if (record.title?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("title");
        matchContext.title = record.title;
      }
      if (record.doctorName?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("doctorName");
        matchContext.doctorName = record.doctorName;
      }
      if (record.hospital?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("hospital");
        matchContext.hospital = record.hospital;
      }
      if (record.symptoms?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("symptoms");
        matchContext.symptoms = record.symptoms?.substring(0, 100);
      }
      if (record.notes?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("notes");
        matchContext.notes = record.notes?.substring(0, 100);
      }
      if (record.tags?.some((tag) => tag.match(new RegExp(query, "i")))) {
        fieldsMatch.push("tags");
        matchContext.tags = record.tags?.filter((tag) => tag.match(new RegExp(query, "i")));
      }

      results.push({
        id: record._id,
        type: "medical-record",
        title: record.title || record.diagnosis || `${record.recordType} on ${record.visitDate}`,
          subtitle: `${record.recordType} - ${record.doctorName || record.hospital || "N/A"}`,
        matchedFields: fieldsMatch,
        matchContext,
        recordType: record.recordType,
        visitDate: record.visitDate,
          patientId: record.patient?._id ? String(record.patient._id) : String(record.patient || ""),
        navigationPath: "/medical-history",
        searchableText: `${record.title} ${record.diagnosis} ${record.notes} ${record.doctorName} ${record.hospital}`,
      });
    });

    const medicationBaseMatch = {
      $or: [
        { "medicines.name": searchRegex },
        { "medicines.dosage": searchRegex },
        { "medicines.frequency": searchRegex },
        { "medicines.prescriptionTag": searchRegex },
        { "medicines.sourceFileName": searchRegex },
        { "medicines.duration": searchRegex },
        { searchKeywords: searchRegex },
        { prescriptionText: searchRegex },
      ],
    };

    const medicationAggregation = [
      {
        $match: safePatientId
          ? { patient: safePatientId }
          : medicationBaseMatch,
      },
      {
        $unwind: "$medicines",
      },
      {
        $match: {
          $or: [
            { "medicines.name": searchRegex },
            { "medicines.dosage": searchRegex },
            { "medicines.frequency": searchRegex },
            { "medicines.prescriptionTag": searchRegex },
            { "medicines.sourceFileName": searchRegex },
            { "medicines.duration": searchRegex },
            { "medicines.searchText": searchRegex },
            { searchKeywords: searchRegex },
            { prescriptionText: searchRegex },
          ],
        },
      },
      ...(safePatientId
        ? []
        : [
            {
              $lookup: {
                from: "patients",
                localField: "patient",
                foreignField: "_id",
                as: "patientInfo",
              },
            },
            {
              $unwind: {
                path: "$patientInfo",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]),
      {
        $limit: parseInt(limit) * 3,
      },
    ];

    const medications = await MedicationPlan.aggregate(medicationAggregation);

    console.log(`Found ${medications.length} medications matching query`);

    medications.forEach((planWithMedicine) => {
      const medicine = planWithMedicine.medicines;
      const plan = planWithMedicine;

      if (
        medicine.name?.match(new RegExp(query, "i")) ||
        medicine.dosage?.match(new RegExp(query, "i")) ||
        medicine.frequency?.match(new RegExp(query, "i")) ||
        medicine.prescriptionTag?.match(new RegExp(query, "i")) ||
        medicine.duration?.match(new RegExp(query, "i")) ||
        medicine.searchText?.match(new RegExp(query, "i")) ||
        plan.searchKeywords?.match(new RegExp(query, "i")) ||
        plan.prescriptionText?.match(new RegExp(query, "i"))
      ) {
        const fieldsMatch = [];
        const matchContext = {};

        if (medicine.name?.match(new RegExp(query, "i"))) {
          fieldsMatch.push("medicine-name");
          matchContext.medicineName = medicine.name;
        }
        if (medicine.dosage?.match(new RegExp(query, "i"))) {
          fieldsMatch.push("dosage");
          matchContext.dosage = medicine.dosage;
        }
        if (medicine.frequency?.match(new RegExp(query, "i"))) {
          fieldsMatch.push("frequency");
          matchContext.frequency = medicine.frequency;
        }
        if (medicine.prescriptionTag?.match(new RegExp(query, "i"))) {
          fieldsMatch.push("prescription-tag");
          matchContext.prescriptionTag = medicine.prescriptionTag;
        }
        if (medicine.duration?.match(new RegExp(query, "i"))) {
          fieldsMatch.push("duration");
          matchContext.duration = medicine.duration;
        }
        if (medicine.searchText?.match(new RegExp(query, "i"))) {
          fieldsMatch.push("searchText");
          matchContext.searchText = medicine.searchText;
        }
        if (plan.searchKeywords?.match(new RegExp(query, "i"))) {
          fieldsMatch.push("searchKeywords");
          matchContext.searchKeywords = plan.searchKeywords;
        }
        if (plan.prescriptionText?.match(new RegExp(query, "i"))) {
          fieldsMatch.push("prescriptionText");
          matchContext.prescriptionText = plan.prescriptionText;
        }

        results.push({
          id: `${plan._id}-${medicine.name}`,
          type: "medication",
          title: `${medicine.name}`,
          subtitle: `${medicine.dosage || "N/A"} - ${medicine.frequency || "N/A"} - ${medicine.duration || ""}`,
          matchedFields: fieldsMatch,
          matchContext,
          patientId: plan.patientInfo?._id ? String(plan.patientInfo._id) : String(plan.patient || ""),
          patientName: plan.patientInfo?.fullName || undefined,
          navigationPath: "/prescriptions",
          searchableText: `${medicine.name} ${medicine.dosage} ${medicine.frequency} ${medicine.prescriptionTag} ${medicine.duration}`,
        });
      }
    });

    // Search in patient info
    const patientQuery = canSearchAllPatients
      ? {
          $or: [
            { fullName: searchRegex },
            { bloodGroup: searchRegex },
            { allergies: searchRegex },
            { chronicDiseases: searchRegex },
            { currentMedications: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
          ],
        }
      : { _id: safePatientId };

    const patients = await Patient.find(patientQuery, {
      fullName: 1,
      bloodGroup: 1,
      allergies: 1,
      chronicDiseases: 1,
      currentMedications: 1,
      emergencyContact: 1,
      email: 1,
      phone: 1,
    });

    patients.forEach((patient) => {
      const fieldsMatch = [];
      const matchContext = {};

      if (patient.fullName?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("name");
        matchContext.name = patient.fullName;
      }
      if (patient.email?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("email");
        matchContext.email = patient.email;
      }
      if (patient.phone?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("phone");
        matchContext.phone = patient.phone;
      }
      if (patient.bloodGroup?.match(new RegExp(query, "i"))) {
        fieldsMatch.push("bloodGroup");
        matchContext.bloodGroup = patient.bloodGroup;
      }
      if (patient.allergies?.some((allergy) => allergy.match(new RegExp(query, "i")))) {
        fieldsMatch.push("allergies");
        matchContext.allergies = patient.allergies?.filter((a) => a.match(new RegExp(query, "i")));
      }
      if (patient.chronicDiseases?.some((disease) => disease.match(new RegExp(query, "i")))) {
        fieldsMatch.push("chronicDiseases");
        matchContext.chronicDiseases = patient.chronicDiseases?.filter((d) => d.match(new RegExp(query, "i")));
      }
      if (patient.currentMedications?.some((med) => med.match(new RegExp(query, "i")))) {
        fieldsMatch.push("currentMedications");
        matchContext.currentMedications = patient.currentMedications?.filter((m) => m.match(new RegExp(query, "i")));
      }

      if (fieldsMatch.length > 0) {
        results.push({
          id: `patient-${patient._id}`,
          type: "patient-info",
          title: `Patient Profile: ${patient.fullName}`,
          subtitle: `Blood Group: ${patient.bloodGroup}`,
          matchedFields: fieldsMatch,
          matchContext,
          patientId: String(patient._id),
          navigationPath: "/profile",
          searchableText: `${patient.fullName} ${patient.email} ${patient.phone} ${patient.bloodGroup} ${patient.allergies?.join(" ")} ${patient.chronicDiseases?.join(" ")} ${patient.currentMedications?.join(" ")}`,
        });
      }
    });

    console.log(`Total results found: ${results.length}`);

    // Sort results by relevance (if search term is found in title/diagnosis, it's more relevant)
    results.sort((a, b) => {
      const aTitle = a.searchableText.toLowerCase();
      const bTitle = b.searchableText.toLowerCase();
      const aStartsWith = aTitle.startsWith(query.toLowerCase()) ? 1 : 0;
      const bStartsWith = bTitle.startsWith(query.toLowerCase()) ? 1 : 0;
      return bStartsWith - aStartsWith;
    });

    res.json({
      query,
      totalResults: results.length,
      results: results.slice(0, parseInt(limit)),
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search failed", error: error.message });
  }
}

module.exports = {
  globalSearch,
};
