/**
 * Document Scanning Optimization Service
 * Processes scanned images to improve OCR accuracy
 */

const fs = require("fs");
const path = require("path");

/**
 * Analyzes image quality for OCR
 * Returns optimization recommendations
 */
function analyzeImageQuality(buffer) {
  const size = buffer.length;
  const sizeInMB = size / (1024 * 1024);

  // Check file size - too small might indicate corruption or low quality
  const isLikelyHighQuality = sizeInMB > 0.05 && sizeInMB < 10;

  // Get JPEG/PNG headers to validate image
  const isJPEG = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50;
  const isPDF = buffer.toString("ascii", 0, 4) === "%PDF";

  return {
    format: isJPEG ? "JPEG" : isPNG ? "PNG" : isPDF ? "PDF" : "UNKNOWN",
    isValid: isJPEG || isPNG || isPDF,
    sizeInMB,
    likelyHighQuality: isLikelyHighQuality,
    recommendations: generateRecommendations(isLikelyHighQuality, sizeInMB),
  };
}

function generateRecommendations(isHighQuality, sizeInMB) {
  const recommendations = [];

  if (!isHighQuality) {
    if (sizeInMB < 0.05) {
      recommendations.push("Image appears to be very small. Ensure good lighting and camera focus.");
    }
    if (sizeInMB > 10) {
      recommendations.push("Image file is large. Consider using compression before upload.");
    }
  }

  if (sizeInMB < 0.1) {
    recommendations.push("Consider using higher resolution camera for better OCR accuracy.");
  }

  return recommendations;
}

/**
 * Prepares image buffer for optimal OCR processing
 * Adds metadata about the scanning conditions
 */
function prepareForOCR(buffer, metadata = {}) {
  const analysis = analyzeImageQuality(buffer);

  return {
    buffer,
    metadata: {
      originalSize: buffer.length,
      format: analysis.format,
      quality: analysis.likelyHighQuality ? "high" : "medium",
      timestamp: metadata.timestamp || new Date().toISOString(),
      source: "mobile-scan",
      ...metadata,
    },
    optimizations: {
      prioritizeHandwritingDetection: true,
      enhanceContrast: true,
      autoRotate: true,
      despeckle: true,
      confidence: analysis.likelyHighQuality ? 0.8 : 0.6,
    },
  };
}

/**
 * Validates scanned document before processing
 */
function validateScannedDocument(buffer, filename = "") {
  const errors = [];
  const warnings = [];

  // Check buffer exists
  if (!buffer || buffer.length === 0) {
    errors.push("Document buffer is empty");
    return { valid: false, errors, warnings };
  }

  // Check file type
  const analysis = analyzeImageQuality(buffer);
  if (!analysis.isValid) {
    errors.push(`Invalid file format: ${analysis.format}`);
  }

  // Check size constraints
  if (buffer.length < 5000) {
    errors.push("Document file is too small (likely corrupted or empty)");
  }

  if (buffer.length > 50 * 1024 * 1024) {
    // 50MB limit
    errors.push("Document file is too large (max 50MB)");
  }

  // Warnings for suboptimal quality
  if (!analysis.likelyHighQuality) {
    warnings.push("Document quality may be suboptimal for OCR. Ensure good lighting and focus.");
  }

  // Check filename for suspicious patterns
  if (filename && filename.includes("..")) {
    errors.push("Invalid filename");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    analysis,
  };
}

/**
 * Generates OCR processing hints based on detected characteristics
 */
function generateOCRHints(buffer) {
  const analysis = analyzeImageQuality(buffer);

  return {
    format: analysis.format,
    likelyHandwritten: false,
    optimizeFor: "prescription", // Could be "lab-report", "x-ray", "consultation-note"
    expectedElements: [
      "medicine names",
      "dosages",
      "frequency",
      "duration",
      "doctor name",
      "date",
      "patient name",
    ],
    enhanceContrast: true,
    despeckle: true,
    autoCorrect: true,
  };
}

module.exports = {
  analyzeImageQuality,
  validateScannedDocument,
  prepareForOCR,
  generateOCRHints,
};
