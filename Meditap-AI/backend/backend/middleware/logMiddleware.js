const AccessLog = require("../models/AccessLog");

const logAccess = (action) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.params.patientId) {
        await AccessLog.create({
          user: req.user._id,
          patient: req.params.patientId,
          role: req.user.role,
          action,
        });
      }
      next();
    } catch (error) {
      console.error("Logging failed:", error.message);
      next();
    }
  };
};

module.exports = logAccess;
