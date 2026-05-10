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

const DEFAULT_TIMES = {
  morning: "08:00",
  afternoon: "13:00",
  evening: "18:00",
  night: "21:00",
};

function safeJsonParse(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : trimmed);
}

function toISODate(value = "") {
  const trimmed = String(value).trim();
  if (!trimmed) return "";

  const directDate = new Date(trimmed);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString().slice(0, 10);
  }

  const match = trimmed.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (!match) return "";

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${month}-${day}`;
}

function inferDurationDays(value = "") {
  const text = value.toLowerCase();
  const number = Number((text.match(/\d+/) || [])[0]);

  if (!number) return 7;
  if (text.includes("month")) return number * 30;
  if (text.includes("week")) return number * 7;
  return number;
}

function inferFrequencyPerDay(value = "", timings = []) {
  const text = value.toLowerCase();
  if (timings.length > 0) return timings.length;
  if (text.includes("thrice") || text.includes("three")) return 3;
  if (text.includes("twice") || text.includes("bid")) return 2;
  if (text.includes("four") || text.includes("qid")) return 4;
  if (text.includes("every 4")) return 6;
  if (text.includes("every 6")) return 4;
  if (text.includes("every 8")) return 3;
  return 1;
}

function normalizeTimings(timing = "", frequency = "") {
  const text = `${timing} ${frequency}`.toLowerCase();
  const timings = [];

  if (text.includes("morning") || text.includes("breakfast")) timings.push("morning");
  if (text.includes("afternoon") || text.includes("lunch")) timings.push("afternoon");
  if (text.includes("evening") || text.includes("dinner")) timings.push("evening");
  if (text.includes("night") || text.includes("bed")) timings.push("night");

  if (timings.length === 0) {
    const count = inferFrequencyPerDay(frequency, []);
    if (count >= 1) timings.push("morning");
    if (count >= 2) timings.push("evening");
    if (count >= 3) timings.splice(1, 0, "afternoon");
    if (count >= 4) timings.push("night");
  }

  return [...new Set(timings)].slice(0, 4);
}

function fallbackExtractMedicines(text) {
  const lines = text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);

  const medicineLines = lines.filter((line) =>
    /\b(tab|tablet|cap|capsule|syrup|inj|injection|mg|mcg|ml|iu)\b/i.test(line)
  );

  return (medicineLines.length ? medicineLines : lines.slice(0, 5)).map((line) => {
    const dosage = (line.match(/\b\d+\s?(mg|mcg|ml|g|iu)\b/i) || [])[0] || "As prescribed";
    const duration = (line.match(/\b\d+\s?(day|days|week|weeks|month|months)\b/i) || [])[0] || "7 days";
    const frequency =
      (line.match(/\b(once daily|twice daily|thrice daily|daily|bid|tid|qid|every \d+ hours?)\b/i) || [])[0] ||
      "Once daily";
    const name = line
      .replace(/\b(tab|tablet|cap|capsule|syrup|inj|injection)\b/gi, "")
      .replace(/\b\d+\s?(mg|mcg|ml|g|iu)\b/gi, "")
      .replace(/\b\d+\s?(day|days|week|weeks|month|months)\b/gi, "")
      .replace(/\b(once daily|twice daily|thrice daily|daily|bid|tid|qid|every \d+ hours?)\b/gi, "")
      .replace(/[-:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      name: name || "Unclear medicine",
      dosage,
      timing: normalizeTimings("", frequency),
      duration,
      durationDays: inferDurationDays(duration),
      frequency,
      frequencyPerDay: inferFrequencyPerDay(frequency, []),
      quantityPerDose: 1,
    };
  });
}

async function extractStructuredMedicines(rawText) {
  if (!selectedProvider.apiKey) {
    return fallbackExtractMedicines(rawText);
  }

  try {
    const response = await openai.chat.completions.create({
      model: selectedProvider.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are the OCR processing agent for NFC Next Level. Convert prescription OCR text into JSON only. Return {\"medicines\":[{\"name\":\"\",\"dosage\":\"\",\"timing\":[\"morning\"],\"duration\":\"\",\"durationDays\":7,\"frequency\":\"\",\"frequencyPerDay\":1,\"quantityPerDose\":1}]}. Use only prescription text. If unsure, use 'As prescribed' and conservative defaults.",
        },
        { role: "user", content: rawText },
      ],
    });

    const parsed = safeJsonParse(response.choices[0].message.content || "{}");
    return Array.isArray(parsed.medicines) && parsed.medicines.length
      ? parsed.medicines
      : fallbackExtractMedicines(rawText);
  } catch (error) {
    console.error("Medication OCR agent fallback:", error.message);
    return fallbackExtractMedicines(rawText);
  }
}

function fallbackExtractRecordSuggestions(rawText = "") {
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const dateLine = lines.find((line) =>
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(line) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(line)
  );
  const doctorLine = lines.find((line) => /\b(dr\.?|doctor)\b/i.test(line));
  const departmentLine = lines.find((line) =>
    /\b(cardiology|neurology|orthopedic|orthopaedic|medicine|general medicine|ent|dermatology|pediatrics|paediatrics|surgery|icu|emergency)\b/i.test(line)
  );
  const hospitalLine = lines.find((line) =>
    /\b(hospital|clinic|medical center|centre|nursing home)\b/i.test(line)
  );

  const descriptionLines = lines
    .filter((line) => line.length >= 8)
    .filter((line) => !/\b(tab|tablet|cap|capsule|mg|ml|dose|daily|bid|tid|qid)\b/i.test(line))
    .slice(0, 3);

  return {
    title: "",
    diagnosis: "",
    description: descriptionLines.join(". "),
    visitDate: dateLine ? toISODate(dateLine) : "",
    doctorName: doctorLine || "",
    department: departmentLine || "",
    hospital: hospitalLine || "",
  };
}

async function extractRecordSuggestions(rawText, context = {}) {
  const fallback = fallbackExtractRecordSuggestions(rawText);

  if (!selectedProvider.apiKey) {
    return fallback;
  }

  try {
    const response = await openai.chat.completions.create({
      model: selectedProvider.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract structured medical-record suggestions from OCR text. Return JSON only with keys title, diagnosis, description, visitDate, doctorName, department, hospital. Rules: diagnosis must contain only diagnosis/condition text, never medicines, doses, procedures, or generic noise. description should be a short 1-2 sentence clinical summary. visitDate must be YYYY-MM-DD or empty. doctorName should contain only provider name. department should contain only department/specialty. hospital should contain only facility name. If a field is unclear, return an empty string.",
        },
        {
          role: "user",
          content: JSON.stringify({
            rawText,
            detectedConditions: context.conditions || [],
            detectedProcedures: context.procedures || [],
            detectedMedicines: context.medications || [],
          }),
        },
      ],
    });

    const parsed = safeJsonParse(response.choices[0].message.content || "{}");
    return {
      title: String(parsed.title || "").trim(),
      diagnosis: String(parsed.diagnosis || "").trim(),
      description: String(parsed.description || "").trim(),
      visitDate: toISODate(parsed.visitDate || ""),
      doctorName: String(parsed.doctorName || "").trim(),
      department: String(parsed.department || "").trim(),
      hospital: String(parsed.hospital || "").trim(),
    };
  } catch (error) {
    console.error("Record suggestion extraction fallback:", error.message);
    return fallback;
  }
}

function buildDoseTimeline(medicines, startDate = new Date()) {
  return medicines.map((medicine) => {
    const durationDays = Number(medicine.durationDays) || inferDurationDays(medicine.duration);
    const timing = normalizeTimings((medicine.timing || []).join(" "), medicine.frequency);
    const doses = [];

    for (let day = 0; day < durationDays; day += 1) {
      timing.forEach((slot) => {
        const [hour, minute] = (DEFAULT_TIMES[slot] || DEFAULT_TIMES.morning).split(":").map(Number);
        const scheduledAt = new Date(startDate);
        scheduledAt.setHours(hour, minute, 0, 0);
        scheduledAt.setDate(startDate.getDate() + day);
        doses.push({
          scheduledAt,
          timingLabel: slot,
          status: "pending",
          reminderLevel: 0,
        });
      });
    }

    const totalQuantity = doses.length * (Number(medicine.quantityPerDose) || 1);
    const refillReminderAt = doses[Math.max(0, doses.length - timing.length * 2)]?.scheduledAt;

    return {
      name: medicine.name || "Unclear medicine",
      dosage: medicine.dosage || "As prescribed",
      timing,
      duration: medicine.duration || `${durationDays} days`,
      durationDays,
      frequency: medicine.frequency || `${timing.length} time(s) daily`,
      frequencyPerDay: timing.length,
      quantityPerDose: Number(medicine.quantityPerDose) || 1,
      stockQuantity: totalQuantity,
      refillReminderAt,
      doses,
    };
  });
}

function getReminderLevel(dose) {
  const minutesLate = (Date.now() - new Date(dose.scheduledAt).getTime()) / 60000;
  if (dose.status !== "pending" || minutesLate < 0) return 0;
  if (minutesLate >= 180) return 4;
  if (minutesLate >= 90) return 3;
  if (minutesLate >= 30) return 2;
  return 1;
}

function summarizeAdherence(plan) {
  const doses = plan.medicines.flatMap((medicine) =>
    medicine.doses.map((dose) => ({
      medicineId: medicine._id,
      medicineName: medicine.name,
      doseId: dose._id,
      scheduledAt: dose.scheduledAt,
      timingLabel: dose.timingLabel,
      status: dose.status,
      reminderLevel: Math.max(dose.reminderLevel || 0, getReminderLevel(dose)),
      verifiedByAI: dose.verifiedByAI,
      takenAt: dose.takenAt,
    }))
  );
  const taken = doses.filter((dose) => dose.status === "taken").length;
  const missed = doses.filter((dose) => dose.status === "missed").length;
  const pending = doses.filter((dose) => dose.status === "pending").length;
  const adherenceRate = doses.length ? Math.round((taken / doses.length) * 100) : 0;

  return { doses, taken, missed, pending, adherenceRate };
}

function verifyIntakeEvidence({ pillDetected, gestureDetected, confidence = 0, notes = "" }) {
  const numericConfidence = Number(confidence) || 0;
  const verified = Boolean(pillDetected) && Boolean(gestureDetected) && numericConfidence >= 0.65;

  return {
    verified,
    confidence: numericConfidence,
    notes:
      notes ||
      (verified
        ? "Pill and intake gesture detected by AI verification agent."
        : "Verification needs pill visibility, intake gesture, and confidence above 65%."),
  };
}

module.exports = {
  buildDoseTimeline,
  extractRecordSuggestions,
  extractStructuredMedicines,
  getReminderLevel,
  summarizeAdherence,
  verifyIntakeEvidence,
};
