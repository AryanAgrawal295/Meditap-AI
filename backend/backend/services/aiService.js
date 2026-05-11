const OpenAI = require("openai");

const aiProvider = (process.env.AI_PROVIDER || "xai").toLowerCase();
const providerConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    baseURL:
      process.env.GEMINI_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
  xai: {
    apiKey: process.env.XAI_API_KEY,
    baseURL: process.env.XAI_BASE_URL || "https://api.x.ai/v1",
    model: process.env.XAI_MODEL || "grok-4.20-beta-latest-non-reasoning",
  },
};

const selectedProvider = providerConfig[aiProvider] || providerConfig.xai;

const openai = new OpenAI({
  apiKey: selectedProvider.apiKey,
  baseURL: selectedProvider.baseURL,
});

function formatMedicalHistory(records) {
  if (!records.length) {
    return "No past medical records found.";
  }

  return records
    .map((record, index) => {
      const prescriptions = Array.isArray(record.prescriptions) && record.prescriptions.length > 0
        ? record.prescriptions.join(", ")
        : "None";
      const tags = Array.isArray(record.tags) && record.tags.length > 0
        ? record.tags.join(", ")
        : "None";
      const doctorName =
        typeof record.doctor === "string"
          ? record.doctor
          : record.doctor?.name || "Unknown";

      return [
        `Record ${index + 1}`,
        `- Visit Date: ${record.visitDate ? new Date(record.visitDate).toLocaleDateString() : "Unknown Date"}`,
        `- Title: ${record.title || "N/A"}`,
        `- Record Type: ${record.recordType || "N/A"}`,
        `- Severity: ${record.severity || "N/A"}`,
        `- Diagnosis: ${record.diagnosis || "N/A"}`,
        `- Symptoms: ${record.symptoms || "N/A"}`,
        `- Description: ${record.description || "N/A"}`,
        `- Notes: ${record.notes || "N/A"}`,
        `- Hospital: ${record.hospital || "N/A"}`,
        `- Department: ${record.department || "N/A"}`,
        `- Prescriptions: ${prescriptions}`,
        `- Tags: ${tags}`,
        `- Doctor: ${doctorName}`,
      ].join("\n");
    })
    .join("\n\n");
}

function formatMedicationPlans(plans = []) {
  if (!plans.length) {
    return "No active NFC Next Level medication plans found.";
  }

  return plans
    .map((plan, planIndex) => {
      const medicines = (plan.medicines || [])
        .map((medicine) => {
          const doses = medicine.doses || [];
          const taken = doses.filter((dose) => dose.status === "taken").length;
          const missed = doses.filter((dose) => dose.status === "missed").length;
          const pending = doses.filter((dose) => dose.status === "pending").length;

          return [
            `- ${medicine.name}`,
            `  Dosage: ${medicine.dosage || "As prescribed"}`,
            `  Frequency: ${medicine.frequency || "N/A"}`,
            `  Duration: ${medicine.duration || "N/A"}`,
            `  Timing: ${(medicine.timing || []).join(", ") || "N/A"}`,
            `  Adherence: ${taken} taken, ${missed} missed, ${pending} pending`,
            `  Refill Reminder: ${medicine.refillReminderAt ? new Date(medicine.refillReminderAt).toLocaleDateString() : "N/A"}`,
          ].join("\n");
        })
        .join("\n");

      return `Medication Plan ${planIndex + 1} (${plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : "Unknown date"})\n${medicines}`;
    })
    .join("\n\n");
}

/**
 * Calls OpenAI API with strict prompting to prevent hallucinations.
 * @param {Object} patientProfile - Patient demographics and basic info
 * @param {Array} medicalHistory - Patient's past medical records
 * @param {String} question - User's query
 * @param {String} ocrContext - (Optional) Additional OCR text to consider
 * @returns {Promise<String>} - AI's safe response
 */
exports.generateMedicalResponse = async (patientProfile, medicalHistory, question, ocrContext = "", medicationPlans = []) => {
  try {
    if (!selectedProvider.apiKey) {
      throw new Error(`Missing API key for provider: ${aiProvider}`);
    }

    // Construct the context payload
    const systemPrompt = `You are MediTap's AI Medical Assistant.
Your primary function is to answer queries based STRICTLY on the provided Patient Profile, Medical History, and any OCR Context provided.
You MUST NOT hallucinate, invent data, or provide diagnoses outside of this context.
You MUST use all available medical record fields, including title, record type, diagnosis, description, notes, hospital, department, tags, prescriptions, and visit date.
If the answer cannot be found in the provided context, you must clearly state: "I do not have enough information in the patient's records to answer that."
When answering:
- Prefer the most recent relevant record when the user asks about a recent or latest visit.
- If there are relevant matching records, summarize them instead of saying information is missing.
- Write in a doctor-friendly format using short sections and bullet points.
- Include dates when available.
- Do not use markdown bold markers like **.

For queries about common symptoms or diseases such as cough, fever, headache, cold, sore throat, or similar minor ailments:
- You may provide general natural remedies based on common knowledge.
- You MUST NOT suggest any kind of medicine, drugs, or pharmaceutical products.
- Always emphasize that this is not medical advice and the patient should consult a qualified doctor for proper diagnosis and treatment.
- Natural remedies should include things like rest, hydration, warm fluids, gentle breathing, warm compresses, and light food.
- Do not replace or act as a substitute for professional medical advice.

When answering any query:
- Use simple, clear, easy-to-understand language.
- If the user's question is written in Hindi, Hinglish, or another language, answer in that same language.
- Keep sentences short and avoid medical jargon.
- If you cannot answer from the provided context, clearly say: "I do not have enough information in the patient's records to answer that."

--- GIVEN CONTEXT ---

[PATIENT PROFILE]
Name: ${patientProfile.fullName}
Age/DOB: ${patientProfile.dateOfBirth || "Unknown"}
Gender: ${patientProfile.gender || "Unknown"}
Blood Group: ${patientProfile.bloodGroup || "Unknown"}
Allergies: ${(patientProfile.allergies || []).join(", ") || "None recorded"}
Chronic Diseases: ${(patientProfile.chronicDiseases || []).join(", ") || "None recorded"}
Current Medications: ${(patientProfile.currentMedications || []).join(", ") || "None recorded"}

[MEDICAL HISTORY (Past Visits)]
${formatMedicalHistory(medicalHistory)}

[NFC NEXT LEVEL MEDICATION ADHERENCE]
${formatMedicationPlans(medicationPlans)}

${ocrContext ? `[NEW OCR CONTEXT (From Uploaded Prescription/Report)]\n${ocrContext}\n` : ""}

---------------------
Answer the following user query accurately and safely relying STRICTLY on the context provided above.
Return the answer in this plain-text structure when relevant:
Summary:
- ...

Relevant Records:
- Date: ...
  Title: ...
  Key Findings: ...

Recommendations from Records:
- ...
`;

    const response = await openai.chat.completions.create({
      model: selectedProvider.model,
      temperature: 0.1, // Very low temperature to reduce creativity/hallucination
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    const providerMessage =
      error?.error?.message ||
      error?.response?.data?.error?.message ||
      error?.message ||
      "Unknown AI provider error";

    console.error("AI Provider Error:", {
      provider: aiProvider,
      model: selectedProvider.model,
      baseURL: selectedProvider.baseURL,
      message: providerMessage,
      status: error?.status || error?.response?.status,
    });

    throw new Error(`Failed to generate AI response: ${providerMessage}`);
  }
};
