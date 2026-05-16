/**
 * Document scanning and image optimization service
 * Enhances scanned document images for better OCR accuracy
 */

export async function optimizeScannedImage(
  buffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<Buffer> {
  // Dynamic import for image processing (can be replaced with backend processing)
  // For now, this prepares the buffer for optimal OCR processing

  const quality = 95;
  const targetWidth = 2560; // High DPI for OCR
  const targetHeight = 1920;

  // If backend processes images, return buffer as-is
  // Otherwise, you can add client-side optimization here
  return buffer;
}

export function generateScanTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

export function createScanFileName(
  documentType: string = 'document',
  timestamp?: string
): string {
  const ts = timestamp || generateScanTimestamp();
  return `scanned-${documentType}-${ts}.jpg`;
}

/**
 * Validation utilities for scanned documents
 */
export function validateScannedImage(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Supported types: JPEG, PNG, WebP, PDF`,
    };
  }

  // Check file size (max 10MB for scanned images)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is 10MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check minimum size (at least 50KB to ensure it's not corrupted)
  const minSize = 50 * 1024;
  if (file.size < minSize) {
    return {
      valid: false,
      error: 'File too small. Minimum size is 50KB',
    };
  }

  return { valid: true };
}
