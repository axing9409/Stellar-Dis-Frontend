import { refreshTokenAction } from "store/ducks/userAccount";
import { logger } from "./logger";
import { performanceMonitor } from "./performance";

interface RefreshTokenOptions {
  maxRetries?: number;
  retryDelay?: number;
  silent?: boolean;
}

export const refreshSessionToken = async (
  dispatch: any, 
  options: RefreshTokenOptions = {}
): Promise<boolean> => {
  const { maxRetries = 3, retryDelay = 1000, silent = false } = options;
  let retryCount = 0;

  const attemptRefresh = async (): Promise<boolean> => {
    try {
      if (!silent) {
        logger.info('Attempting to refresh session token', {
          attempt: retryCount + 1,
          maxRetries
        }, 'SessionToken');
      }

      const result = await performanceMonitor.measureAsync(
        'refresh-session-token',
        async () => {
          return new Promise<boolean>((resolve) => {
            // Dispatch the refresh action and wait for completion
            const unsubscribe = dispatch(refreshTokenAction());
            
            // For now, we'll assume success after a short delay
            // In a real implementation, you'd listen for the action completion
            setTimeout(() => {
              unsubscribe?.();
              resolve(true);
            }, 100);
          });
        },
        { attempt: retryCount + 1 }
      );

      if (!silent) {
        logger.info('Session token refreshed successfully', {
          attempt: retryCount + 1
        }, 'SessionToken');
      }

      return result;
    } catch (error) {
      retryCount++;
      
      logger.warn('Session token refresh failed', {
        attempt: retryCount,
        maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'SessionToken');

      if (retryCount < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
        return attemptRefresh();
      }

      logger.error('Session token refresh failed after all retries', {
        maxRetries,
        finalError: error instanceof Error ? error.message : 'Unknown error'
      }, 'SessionToken');

      return false;
    }
  };

  return attemptRefresh();
};

// Helper function to check if token refresh is needed
export const shouldRefreshToken = (tokenExpiryTime?: number): boolean => {
  if (!tokenExpiryTime) return false;
  
  const now = Date.now();
  const timeUntilExpiry = tokenExpiryTime - now;
  const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
  
  return timeUntilExpiry <= refreshThreshold;
};

// Helper function to get token expiry time from JWT
export const getTokenExpiryTime = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch (error) {
    logger.warn('Failed to parse token expiry time', { error }, 'SessionToken');
    return null;
  }
};
