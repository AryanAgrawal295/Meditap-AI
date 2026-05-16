const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  getAllUsers,
  updateUserRole,
  toggleUserBlock,
  getAccessLogs,
} = require("../controllers/adminController");

router.get("/users", auth, role("admin"), getAllUsers);
router.patch("/users/:id/role", auth, role("admin"), updateUserRole);
router.patch("/users/:id/block", auth, role("admin"), toggleUserBlock);
router.get("/access-logs", auth, role("admin"), getAccessLogs);

module.exports = router;