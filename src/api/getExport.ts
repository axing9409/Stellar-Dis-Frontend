import { API_URL } from "constants/envVariables";
import { getSdpTenantName } from "helpers/getSdpTenantName";
import { handleSearchParams } from "api/handleSearchParams";
import { logger } from "helpers/logger";
import { performanceMonitor } from "helpers/performance";
import { Export } from "types";

export interface ExportOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  validateFile?: boolean;
  maxFileSize?: number; // in bytes
}

export const getExport = async <T>(
  token: string,
  type: Export,
  searchParams?: T,
  options: ExportOptions = {}
): Promise<void> => {
  const { onProgress, onError, validateFile = true, maxFileSize = 100 * 1024 * 1024 } = options; // 100MB default

  try {
    // Validate input parameters
    if (!token || token.trim() === '') {
      throw new Error('Token is required for export');
    }

    if (!type || typeof type !== 'string') {
      throw new Error('Export type is required');
    }

    logger.info('Starting export request', {
      type,
      searchParams: searchParams ? Object.keys(searchParams) : [],
      validateFile,
      maxFileSize
    }, 'Export');

    const params = handleSearchParams(searchParams);

    const result = await performanceMonitor.measureAsync(
      'export-api-call',
      async () => {
        const response = await fetch(`${API_URL}/exports/${type}${params}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "SDP-Tenant-Name": getSdpTenantName(),
          },
        });

        if (!response.ok) {
          const errorMessage = `Export failed with status: ${response.status}`;
          logger.error(errorMessage, {
            type,
            status: response.status,
            statusText: response.statusText
          }, 'Export');
          throw new Error(errorMessage);
        }

        // Check content type
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes('text/csv') && !contentType.includes('application/octet-stream')) {
          logger.warn('Unexpected content type for export', {
            type,
            contentType
          }, 'Export');
        }

        // Check file size
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
          const fileSize = parseInt(contentLength, 10);
          if (fileSize > maxFileSize) {
            const errorMessage = `Export file too large: ${fileSize} bytes (max: ${maxFileSize})`;
            logger.error(errorMessage, { type, fileSize, maxFileSize }, 'Export');
            throw new Error(errorMessage);
          }
        }

        return response;
      },
      { type, searchParams: searchParams ? Object.keys(searchParams) : [] }
    );

    // Extract filename from headers
    const contentDisposition = result.headers.get("content-disposition");
    let filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, '')
      : `${type}_${new Date().toISOString().split("T")[0]}.csv`;

    // Clean up filename
    filename = filename?.replace(/[<>:"/\\|?*]/g, '_') || `${type}_export.csv`;

    // Create blob and validate if requested
    const blob = await result.blob();
    
    if (validateFile) {
      const validationResult = validateExportFile(blob, type);
      if (!validationResult.isValid) {
        throw new Error(`Export file validation failed: ${validationResult.errors.join(', ')}`);
      }
    }

    // Create download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.style.display = "none";
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    // Clean up URL
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

    logger.info('Export completed successfully', {
      type,
      filename,
      fileSize: blob.size,
      contentType: blob.type
    }, 'Export');

    if (onProgress) {
      onProgress(100);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
    logger.error('Export failed', error, 'Export');
    
    if (onError) {
      onError(error instanceof Error ? error : new Error(errorMessage));
    }
    
    throw error;
  }
};

// Validate export file
const validateExportFile = (blob: Blob, type: Export): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  try {
    // Check file size
    if (blob.size === 0) {
      errors.push('Export file is empty');
    }

    // Check file type
    if (!blob.type.includes('text/csv') && !blob.type.includes('application/octet-stream')) {
      errors.push(`Unexpected file type: ${blob.type}`);
    }

    // Check for minimum content (basic CSV validation)
    if (blob.size > 0) {
      // This is a basic check - in a real implementation you might want to read the content
      const minSize = 10; // Minimum size for a valid CSV
      if (blob.size < minSize) {
        errors.push(`File too small to be valid: ${blob.size} bytes`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Error validating export file', error, 'Export');
    errors.push('Error during file validation');
    return { isValid: false, errors };
  }
};

// Helper function to get export status
export const getExportStatus = (type: Export): {
  isSupported: boolean;
  description: string;
  estimatedTime?: string;
} => {
  const exportInfo = {
    disbursements: {
      isSupported: true,
      description: 'Export disbursement data with payment details',
      estimatedTime: '30 seconds'
    },
    payments: {
      isSupported: true,
      description: 'Export payment transaction data',
      estimatedTime: '45 seconds'
    },
    receivers: {
      isSupported: true,
      description: 'Export receiver information and wallet details',
      estimatedTime: '20 seconds'
    }
  };

  return exportInfo[type] || {
    isSupported: false,
    description: 'Export type not supported'
  };
};
