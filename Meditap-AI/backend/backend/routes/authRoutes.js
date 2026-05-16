const express = require("express");
const router = express.Router();
const {
  register,
  login,
  loginPatientAccess,
  sendOtp,
  verifyOtp,
  refreshToken
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/patient-access", loginPatientAccess);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/refresh-token", refreshToken);


module.exports = router;
