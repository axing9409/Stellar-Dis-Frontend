import { sessionExpiredAction } from "store/ducks/userAccount";
import { USE_SSO } from "constants/envVariables";
import { SESSION_EXPIRED } from "constants/settings";
import { singleUserStore } from "helpers/singleSingOn";
import { logger } from "./logger";
import { localStorageSessionToken } from "./localStorageSessionToken";

export const endSessionIfTokenInvalid = async (error: string, dispatch: any): Promise<void> => {
  try {
    if (error === SESSION_EXPIRED) {
      logger.info('Session expired, ending user session', {
        error,
        useSSO: USE_SSO
      }, 'SessionManagement');

      // Clear session token from localStorage
      const tokenCleared = localStorageSessionToken.remove();
      
      if (USE_SSO) {
        try {
          // Reset user store (from session storage)
          await singleUserStore();
          logger.info('SSO user store reset successfully', {}, 'SessionManagement');
        } catch (ssoError) {
          logger.error('Failed to reset SSO user store', ssoError, 'SessionManagement');
        }
      }

      // Dispatch session expired action
      dispatch(sessionExpiredAction());
      
      logger.info('Session ended successfully', {
        tokenCleared,
        useSSO: USE_SSO
      }, 'SessionManagement');
    } else {
      logger.debug('Session not expired, continuing', { error }, 'SessionManagement');
    }
  } catch (sessionError) {
    logger.error('Failed to end session', sessionError, 'SessionManagement');
    
    // Force session cleanup even if there's an error
    try {
      localStorageSessionToken.remove();
      dispatch(sessionExpiredAction());
    } catch (cleanupError) {
      logger.error('Failed to force session cleanup', cleanupError, 'SessionManagement');
    }
  }
};

// Helper function to check if session should be ended
export const shouldEndSession = (error: any): boolean => {
  if (typeof error === 'string') {
    return error === SESSION_EXPIRED;
  }
  
  if (error?.message) {
    return error.message === SESSION_EXPIRED;
  }
  
  if (error?.error) {
    return error.error === SESSION_EXPIRED;
  }
  
  return false;
};

// Helper function to get session status
export const getSessionStatus = (): {
  hasValidToken: boolean;
  tokenInfo: ReturnType<typeof localStorageSessionToken.getInfo>;
  isSSO: boolean;
} => {
  const tokenInfo = localStorageSessionToken.getInfo();
  const hasValidToken = tokenInfo.hasToken && tokenInfo.isValid;
  
  return {
    hasValidToken,
    tokenInfo,
    isSSO: USE_SSO
  };
};
