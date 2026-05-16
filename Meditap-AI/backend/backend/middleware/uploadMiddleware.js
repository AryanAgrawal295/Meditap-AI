const multer = require("multer");

const storage = multer.memoryStorage();
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Only PDF, JPG, JPEG, and PNG files are allowed."));
      return;
    }

    cb(null, true);
  },
});

module.exports = upload;
