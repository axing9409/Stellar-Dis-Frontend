import { SESSION_EXPIRED } from "constants/settings";
import { ApiError } from "types";
import { logger } from "helpers/logger";

export interface ApiResponseOptions {
  skipLogging?: boolean;
  context?: string;
}

export const handleApiResponse = async (
  response: Response, 
  options: ApiResponseOptions = {}
) => {
  const { skipLogging = false, context = 'API' } = options;

  // Log request details
  if (!skipLogging) {
    logger.info(`API ${response.status} ${response.statusText}`, {
      url: response.url,
      status: response.status,
      statusText: response.statusText
    }, context);
  }

  // Handle authentication errors
  if (response.status === 401) {
    logger.warn('Session expired, redirecting to login', { url: response.url }, context);
    throw SESSION_EXPIRED;
  }

  // Handle server errors
  if (response.status >= 500) {
    const errorMessage = `Server error: ${response.status} ${response.statusText}`;
    logger.error(errorMessage, { url: response.url, status: response.status }, context);
    throw new Error(errorMessage);
  }

  // Handle client errors
  if (response.status >= 400) {
    const errorMessage = `Client error: ${response.status} ${response.statusText}`;
    logger.warn(errorMessage, { url: response.url, status: response.status }, context);
  }

  // Parse response
  let responseJson;
  try {
    responseJson = await response.json();
  } catch (error) {
    const errorMessage = 'Failed to parse API response';
    logger.error(errorMessage, error, context);
    throw new Error(errorMessage);
  }

  // Handle API errors
  if (responseJson.error) {
    const apiError = responseJson as ApiError;
    logger.error('API returned error', {
      error: apiError.error,
      message: apiError.message,
      url: response.url
    }, context);
    throw apiError;
  }

  // Log successful responses
  if (!skipLogging && response.status >= 200 && response.status < 300) {
    logger.info('API request successful', {
      url: response.url,
      status: response.status
    }, context);
  }

  return responseJson;
};
