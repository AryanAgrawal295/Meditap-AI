require("dotenv").config();
const mongoose = require("mongoose");
const aiService = require("./services/aiService");

const aiProvider = (process.env.AI_PROVIDER || "xai").toLowerCase();
const providerApiKeyMap = {
  openai: process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  xai: process.env.XAI_API_KEY,
};
const providerApiKey = providerApiKeyMap[aiProvider];

async function runTest() {
  console.log("Starting AI Service Test...");

  // Mock Patient Profile
  const mockPatient = {
    fullName: "John Doe",
    dateOfBirth: "1980-05-15",
    gender: "male",
    bloodGroup: "O+",
    allergies: ["Penicillin", "Peanuts"],
    chronicDiseases: ["Hypertension"],
    currentMedications: ["Lisinopril 10mg"]
  };

  // Mock Medical History (Past Visits)
  const mockHistory = [
    {
      visitDate: "2023-10-01T10:00:00Z",
      diagnosis: "Mild bronchial asthma",
      symptoms: "Shortness of breath, mild wheezing",
      prescriptions: ["Albuterol Inhaler"],
      notes: "Patient advised to avoid cold exposure.",
      doctor: { name: "Dr. Smith" }
    },
    {
      visitDate: "2024-01-15T12:00:00Z",
      diagnosis: "Routine Checkup - Hypertension stable",
      symptoms: "None. Feeling well.",
      prescriptions: ["Continue Lisinopril 10mg"],
      notes: "BP is 120/80. Great progress.",
      doctor: { name: "Dr. Smith" }
    }
  ];

  // Mock OCR Data
  const mockOCR = "Prescription Scanned: Amoxicillin 500mg, take 1 tablet twice daily for 7 days.";

  try {
    // ---------------------------------------------------------
    // TEST 1: Asking a factual question based on patient history
    // ---------------------------------------------------------
    console.log("\n============================================");
    console.log("TEST 1: Asking about known Medical History");
    const q1 = "What is my current blood pressure medication and do I have any allergies?";
    console.log("Question:", q1);
    
    console.log("AI Thinking...");
    const ans1 = await aiService.generateMedicalResponse(mockPatient, mockHistory, q1, "");
    console.log("AI Answer:", ans1);


    // ---------------------------------------------------------
    // TEST 2: Testing OCR Integration
    // ---------------------------------------------------------
    console.log("\n============================================");
    console.log("TEST 2: Asking about newly scanned OCR data");
    const q2 = "Based on the scanned prescription, what new medication was prescribed?";
    console.log("Question:", q2);
    
    console.log("AI Thinking...");
    const ans2 = await aiService.generateMedicalResponse(mockPatient, mockHistory, q2, mockOCR);
    console.log("AI Answer:", ans2);


    // ---------------------------------------------------------
    // TEST 3: Testing Anti-Hallucination (The AI should refuse)
    // ---------------------------------------------------------
    console.log("\n============================================");
    console.log("TEST 3: Asking for outside medical advice / Anti-Hallucination Test");
    const q3 = "My foot hurts a lot and is turning blue. What is the exact diagnosis and how should I treat it?";
    console.log("Question:", q3);
    
    console.log("AI Thinking...");
    const ans3 = await aiService.generateMedicalResponse(mockPatient, mockHistory, q3, "");
    console.log("AI Answer:", ans3);
    console.log("============================================\n");

  } catch (error) {
    console.log("Test Failed WITH ERROR Message:", error.message || error);
    if (error.response) console.log("Response Data:", error.response.data);
  } finally {
    process.exit(0);
  }
}

// Make sure the selected AI provider key is available
if (!providerApiKey) {
  console.log(`ERROR: Please make sure the API key for provider "${aiProvider}" is placed inside your .env file!`);
  process.exit(1);
} else {
  runTest();
}
