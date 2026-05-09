const User = require("../models/User");
const AccessLog = require("../models/AccessLog");

/**
 * GET all users
 */
exports.getAllUsers = async (req, res) => {
  const users = await User.find().select("-password -refreshToken");
  res.json(users);
};

/**
 * Change user role
 */
exports.updateUserRole = async (req, res) => {
  const { role } = req.body;

  if (!["doctor", "receptionist", "emergency", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select("-password");

  res.json(user);
};

/**
 * Block / Unblock user
 */
exports.toggleUserBlock = async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isBlocked = !user.isBlocked;
  await user.save();

  res.json({
    message: `User ${user.isBlocked ? "blocked" : "unblocked"}`,
  });
};

/**
 * Access logs (audit)
 */
exports.getAccessLogs = async (req, res) => {
  const logs = await AccessLog.find()
    .populate("userId", "name email role")
    .populate("patientId", "name")
    .sort({ createdAt: -1 });

  res.json(logs);
};