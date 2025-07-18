import { getDisbursementInstructions } from "api/getDisbursementInstructions";
import { logger } from "./logger";
import { performanceMonitor } from "./performance";

export const getInstructionsFile = async ({
  token,
  disbursementId,
  fileName,
}: {
  token: string;
  disbursementId: string;
  fileName: string;
}): Promise<File> => {
  try {
    // Validate input parameters
    if (!token || token.trim() === '') {
      throw new Error('Token is required');
    }

    if (!disbursementId || disbursementId.trim() === '') {
      throw new Error('Disbursement ID is required');
    }

    if (!fileName || fileName.trim() === '') {
      throw new Error('File name is required');
    }

    logger.info('Fetching disbursement instructions', {
      disbursementId,
      fileName
    }, 'InstructionsFile');

    const file = await performanceMonitor.measureAsync(
      'get-instructions-file',
      async () => {
        return await getDisbursementInstructions(token, disbursementId);
      },
      { disbursementId, fileName }
    );

    // Validate file data
    if (!file || file.size === 0) {
      logger.warn('Empty instructions file received', {
        disbursementId,
        fileName,
        fileSize: file?.size
      }, 'InstructionsFile');
    }

    const resultFile = new File([file], fileName, {
      type: file.type,
    });

    logger.info('Instructions file created successfully', {
      disbursementId,
      fileName,
      fileSize: resultFile.size,
      fileType: resultFile.type
    }, 'InstructionsFile');

    return resultFile;
  } catch (error) {
    logger.error('Failed to get instructions file', error, 'InstructionsFile');
    throw error;
  }
};
