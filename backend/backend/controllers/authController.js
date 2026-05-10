const User = require("../models/User");
const Patient = require("../models/Patient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Otp = require("../models/Otp");


exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  res.status(201).json(user);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  // 🔐 Access Token (short life)
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  // 🔁 Refresh Token (long life)
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Save refresh token in DB
  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    accessToken,
    refreshToken,
    role: user.role,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

function signPatientTokens(patient, role) {
  const tokenPayload = {
    id: patient._id,
    patientId: patient._id,
    role,
    sessionType: "patient",
  };

  return {
    accessToken: jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "15m" }),
    refreshToken: jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "7d" }),
  };
}

exports.loginPatientAccess = async (req, res) => {
  try {
    const { patientId, password } = req.body;

    if (!patientId || !password) {
      return res.status(400).json({ message: "Patient and password are required" });
    }

    const patient = await Patient.findById(patientId).select("+uploaderPassword +viewerPassword");

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const isUploader = patient.uploaderPassword
      ? await bcrypt.compare(String(password), patient.uploaderPassword)
      : false;
    const isViewer = patient.viewerPassword
      ? await bcrypt.compare(String(password), patient.viewerPassword)
      : false;

    if (!isUploader && !isViewer) {
      return res.status(400).json({ message: "Invalid patient access password" });
    }

    const role = isUploader ? "doctor" : "receptionist";
    const { accessToken, refreshToken } = signPatientTokens(patient, role);

    res.json({
      accessToken,
      refreshToken,
      role,
      user: {
        id: patient._id,
        name: patient.fullName,
        email: patient.email || "",
        role,
        patientId: patient._id,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendOtp = async (req, res) => {
  const { userId, email, role } = req.body;
  let user = null;

  if (userId) {
    user = await User.findById(userId);
  } else if (email) {
    user = await User.findOne({
      email,
      ...(role ? { role } : {}),
    });
  }

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  await Otp.create({
    userId: user._id,
    otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  console.log("OTP:", otp); // later integrate SMS

  res.json({ message: "OTP Sent", userId: user._id });
};

exports.verifyOtp = async (req, res) => {
  const { userId, email, role, otp } = req.body;
  let user = null;

  if (userId) {
    user = await User.findById(userId);
  } else if (email) {
    user = await User.findOne({
      email,
      ...(role ? { role } : {}),
    });
  }

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const record = await Otp.findOne({ userId: user._id, otp });

  if (!record) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (record.expiresAt < new Date()) {
    return res.status(400).json({ message: "OTP Expired" });
  }

  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  user.refreshToken = refreshToken;
  await user.save();
  await record.deleteOne();

  res.json({
    message: "OTP Verified",
    accessToken,
    refreshToken,
    role: user.role,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token required" });
  }

  jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Expired refresh token" });
    }

    if (decoded.sessionType === "patient") {
      const patient = await Patient.findById(decoded.patientId || decoded.id);

      if (!patient) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      const newAccessToken = jwt.sign(
        {
          id: patient._id,
          patientId: patient._id,
          role: decoded.role,
          sessionType: "patient",
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      return res.json({ accessToken: newAccessToken });
    }

    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  });
};

