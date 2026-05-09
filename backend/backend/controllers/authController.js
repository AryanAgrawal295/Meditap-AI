const User = require("../models/User");
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

  const user = await User.findOne({ refreshToken });
  if (!user) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }

  jwt.verify(refreshToken, process.env.JWT_SECRET, (err) => {
    if (err) {
      return res.status(403).json({ message: "Expired refresh token" });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  });
};

