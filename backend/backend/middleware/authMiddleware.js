const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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