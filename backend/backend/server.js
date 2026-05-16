require("dotenv").config();   // MUST BE FIRST

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const adminRoutes = require("./routes/adminRoutes");
const ocrRoutes = require("./routes/ocrRoutes");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.get("/", (req, res) => {
  res.send("NFC Next Level Backend Running...");
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/medical", require("./routes/medicalRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/nfc", require("./routes/nfcRoutes"));
app.use("/api/medication", require("./routes/medicationRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/admin", adminRoutes);
app.use("/api/ocr", ocrRoutes);

app.use(limiter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
