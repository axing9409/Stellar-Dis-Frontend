import { LOCAL_STORAGE_SESSION_TOKEN } from "constants/settings";
import { logger } from "./logger";

export const localStorageSessionToken = {
  get: (): string | null => {
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_SESSION_TOKEN);
      
      if (token) {
        logger.debug('Session token retrieved from localStorage', {
          tokenLength: token.length,
          hasToken: !!token
        }, 'SessionStorage');
      }
      
      return token;
    } catch (error) {
      logger.error('Failed to get session token from localStorage', error, 'SessionStorage');
      return null;
    }
  },

  set: (token: string): boolean => {
    try {
      // Validate token format (basic JWT validation)
      if (!token || typeof token !== 'string') {
        logger.warn('Invalid token format provided', { tokenType: typeof token }, 'SessionStorage');
        return false;
      }

      // Basic JWT structure validation
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        logger.warn('Invalid JWT token structure', { parts: tokenParts.length }, 'SessionStorage');
        return false;
      }

      localStorage.setItem(LOCAL_STORAGE_SESSION_TOKEN, token);
      
      logger.info('Session token stored in localStorage', {
        tokenLength: token.length,
        timestamp: new Date().toISOString()
      }, 'SessionStorage');
      
      return true;
    } catch (error) {
      logger.error('Failed to store session token in localStorage', error, 'SessionStorage');
      return false;
    }
  },

  remove: (): boolean => {
    try {
      const hadToken = !!localStorage.getItem(LOCAL_STORAGE_SESSION_TOKEN);
      localStorage.removeItem(LOCAL_STORAGE_SESSION_TOKEN);
      
      if (hadToken) {
        logger.info('Session token removed from localStorage', {
          timestamp: new Date().toISOString()
        }, 'SessionStorage');
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to remove session token from localStorage', error, 'SessionStorage');
      return false;
    }
  },

  // Helper method to check if token exists and is valid
  isValid: (): boolean => {
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_SESSION_TOKEN);
      
      if (!token) {
        return false;
      }

      // Basic JWT validation
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return false;
      }

      // Check if token is expired
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        
        if (expiryTime && now > expiryTime) {
          logger.warn('Session token is expired', {
            expiryTime: new Date(expiryTime).toISOString(),
            currentTime: new Date(now).toISOString()
          }, 'SessionStorage');
          return false;
        }
      } catch (parseError) {
        logger.warn('Failed to parse token payload', { error: parseError }, 'SessionStorage');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate session token', error, 'SessionStorage');
      return false;
    }
  },

  // Helper method to get token info
  getInfo: (): { hasToken: boolean; isValid: boolean; expiryTime?: string } => {
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_SESSION_TOKEN);
      const hasToken = !!token;
      
      if (!hasToken) {
        return { hasToken: false, isValid: false };
      }

      // Parse token to get expiry time
      try {
        const tokenParts = token!.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiryTime = payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined;
          const isValid = !payload.exp || Date.now() < payload.exp * 1000;
          
          return { hasToken, isValid, expiryTime };
        }
      } catch (parseError) {
        logger.warn('Failed to parse token for info', { error: parseError }, 'SessionStorage');
      }

      return { hasToken, isValid: false };
    } catch (error) {
      logger.error('Failed to get token info', error, 'SessionStorage');
      return { hasToken: false, isValid: false };
    }
  }
};
