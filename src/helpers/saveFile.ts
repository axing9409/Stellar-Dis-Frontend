import { logger } from "./logger";

export interface SaveFileOptions {
  validateFile?: boolean;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export const saveFile = ({
  file,
  fileUrl,
  suggestedFileName,
  callback,
  delay = 3000,
  options = {}
}: {
  file?: File;
  fileUrl?: string;
  suggestedFileName: string;
  callback?: () => void;
  delay?: number;
  options?: SaveFileOptions;
}) => {
  const { validateFile = true, maxFileSize = 100 * 1024 * 1024, allowedTypes, onProgress, onError } = options;

  try {
    // Validate input parameters
    if (!file && !fileUrl) {
      const error = new Error("Either file or fileUrl is required");
      logger.error('Save file failed: missing input', error, 'FileSave');
      if (onError) onError(error);
      throw error;
    }

    if (!suggestedFileName || suggestedFileName.trim() === '') {
      const error = new Error("Suggested filename is required");
      logger.error('Save file failed: missing filename', error, 'FileSave');
      if (onError) onError(error);
      throw error;
    }

    // Validate file if provided
    if (file && validateFile) {
      const validationResult = validateFileForSave(file, { maxFileSize, allowedTypes });
      if (!validationResult.isValid) {
        const error = new Error(`File validation failed: ${validationResult.errors.join(', ')}`);
        logger.error('Save file failed: validation error', error, 'FileSave');
        if (onError) onError(error);
        throw error;
      }
    }

    // Create object URL
    const objUrl = file ? URL.createObjectURL(file) : fileUrl;
    
    if (!objUrl) {
      const error = new Error("Failed to create object URL");
      logger.error('Save file failed: URL creation error', error, 'FileSave');
      if (onError) onError(error);
      throw error;
    }

    // Clean up filename
    const cleanFileName = sanitizeFileName(suggestedFileName);

    // Create download link
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = cleanFileName;
    a.style.display = "none";

    // Add to DOM and trigger download
    document.body.append(a);
    a.click();

    // Log successful save
    logger.info('File saved successfully', {
      fileName: cleanFileName,
      fileSize: file?.size,
      fileType: file?.type,
      originalFileName: suggestedFileName
    }, 'FileSave');

    // Clean up
    const cleanup = () => {
      try {
        URL.revokeObjectURL(objUrl);
        a.remove();

        if (callback) {
          callback();
        }
      } catch (cleanupError) {
        logger.error('Error during file save cleanup', cleanupError, 'FileSave');
      }
    };

    const timeoutId = setTimeout(cleanup, delay);

    // Return cleanup function for manual cleanup if needed
    return {
      cleanup: () => {
        clearTimeout(timeoutId);
        cleanup();
      }
    };

  } catch (error) {
    logger.error('Save file operation failed', error, 'FileSave');
    if (onError) onError(error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  }
};

// Validate file for saving
const validateFileForSave = (file: File, options: { maxFileSize?: number; allowedTypes?: string[] }): {
  isValid: boolean;
  errors: string[];
} => {
  const { maxFileSize = 100 * 1024 * 1024, allowedTypes } = options;
  const errors: string[] = [];

  try {
    // Check file size
    if (file.size === 0) {
      errors.push('File is empty');
    }

    if (file.size > maxFileSize) {
      errors.push(`File too large: ${formatFileSize(file.size)} (max: ${formatFileSize(maxFileSize)})`);
    }

    // Check file type if specified
    if (allowedTypes && allowedTypes.length > 0) {
      const fileType = file.type.toLowerCase();
      const isAllowed = allowedTypes.some(allowedType => 
        fileType.includes(allowedType.toLowerCase())
      );
      
      if (!isAllowed) {
        errors.push(`File type not allowed: ${file.type}. Allowed: ${allowedTypes.join(', ')}`);
      }
    }

    // Check for common malicious file types
    const dangerousTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msi',
      'application/x-msdos-program'
    ];
    
    if (dangerousTypes.includes(file.type)) {
      errors.push('Potentially dangerous file type detected');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Error validating file for save', error, 'FileSave');
    errors.push('Error during file validation');
    return { isValid: false, errors };
  }
};

// Sanitize filename for safe download
const sanitizeFileName = (filename: string): string => {
  try {
    // Remove or replace invalid characters
    let cleanName = filename.replace(/[<>:"/\\|?*]/g, '_');
    
    // Remove leading/trailing spaces and dots
    cleanName = cleanName.trim().replace(/^\.+|\.+$/g, '');
    
    // Ensure filename is not empty
    if (!cleanName) {
      cleanName = 'download';
    }
    
    // Limit length
    if (cleanName.length > 255) {
      const extension = cleanName.split('.').pop();
      const nameWithoutExt = cleanName.substring(0, cleanName.lastIndexOf('.'));
      cleanName = nameWithoutExt.substring(0, 255 - extension!.length - 1) + '.' + extension;
    }
    
    return cleanName;
  } catch (error) {
    logger.error('Error sanitizing filename', error, 'FileSave');
    return 'download';
  }
};

// Format file size for display
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
