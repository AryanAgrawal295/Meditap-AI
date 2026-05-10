const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Patient = require("../models/Patient");

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.sessionType === "patient") {
      const patient = await Patient.findById(decoded.patientId || decoded.id);

      if (!patient) {
        return res.status(401).json({ message: "Patient session not found" });
      }

      req.user = {
        _id: patient._id,
        name: patient.fullName,
        email: patient.email,
        role: decoded.role,
        patientId: patient._id,
        isPatientSession: true,
      };

      return next();
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔥 THIS IS THE ONLY ADDITION
    if (user.isBlocked) {
      return res.status(403).json({ message: "Account blocked by admin" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token invalid" });
  }
};
