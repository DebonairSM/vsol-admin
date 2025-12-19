import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { Request } from 'express';

// Configure multer for consultant document uploads
export const uploadConsultantDocument = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: async (req: Request, file, cb) => {
    // First check MIME type from headers
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG and PNG files are allowed'));
    }
    
    // Note: Actual file content validation happens in the route handler
    // after multer processes the file, since we need the buffer
    cb(null, true);
  },
});

/**
 * Validate file content using magic bytes (file signatures)
 * This prevents MIME type spoofing attacks
 */
export async function validateFileContent(
  buffer: Buffer,
  expectedMimeTypes: string[] = ['image/jpeg', 'image/png']
): Promise<{ valid: boolean; detectedMime?: string; error?: string }> {
  try {
    // Read magic bytes to detect actual file type
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      return {
        valid: false,
        error: 'Unable to detect file type from file content'
      };
    }
    
    // Map detected MIME types to allowed types
    // file-type returns 'image/jpeg' for JPEG files
    const detectedMime = fileType.mime;
    
    // Normalize MIME types for comparison
    const normalizedDetected = detectedMime.toLowerCase();
    const normalizedExpected = expectedMimeTypes.map(m => m.toLowerCase());
    
    // Check if detected type matches expected types
    if (!normalizedExpected.includes(normalizedDetected)) {
      return {
        valid: false,
        detectedMime,
        error: `File content type (${detectedMime}) does not match expected types (${expectedMimeTypes.join(', ')})`
      };
    }
    
    return {
      valid: true,
      detectedMime
    };
  } catch (error) {
    return {
      valid: false,
      error: `File validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Configure multer for invoice uploads (PDF and images)
export const uploadInvoice = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for invoices
  },
  fileFilter: async (req: Request, file, cb) => {
    // First check MIME type from headers
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Only PDF, JPEG and PNG files are allowed'));
    }
    
    // Note: Actual file content validation happens in the route handler
    // after multer processes the file, since we need the buffer
    cb(null, true);
  },
});

