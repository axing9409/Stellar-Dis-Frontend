import { logger } from "./logger";

export const isValidWalletAddress = (address: string): boolean => {
  try {
    if (!address || typeof address !== 'string') {
      return false;
    }

    const WALLET_ADDRESS_PREFIX = "G";
    const WALLET_ADDRESS_LENGTH = 56;
    const WALLET_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

    // Basic format validation
    if (!address.startsWith(WALLET_ADDRESS_PREFIX)) {
      logger.debug('Wallet address does not start with G', { address }, 'WalletValidation');
      return false;
    }

    if (address.length !== WALLET_ADDRESS_LENGTH) {
      logger.debug('Wallet address has incorrect length', { 
        address, 
        length: address.length, 
        expected: WALLET_ADDRESS_LENGTH 
      }, 'WalletValidation');
      return false;
    }

    // Regex validation for proper Stellar address format
    if (!WALLET_ADDRESS_REGEX.test(address)) {
      logger.debug('Wallet address does not match Stellar format', { address }, 'WalletValidation');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error validating wallet address', error, 'WalletValidation');
    return false;
  }
};

// Enhanced wallet validation with detailed error information
export const validateWalletAddress = (address: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  try {
    if (!address || typeof address !== 'string') {
      errors.push('Address is required and must be a string');
      return { isValid: false, errors };
    }

    const WALLET_ADDRESS_PREFIX = "G";
    const WALLET_ADDRESS_LENGTH = 56;
    const WALLET_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

    // Check prefix
    if (!address.startsWith(WALLET_ADDRESS_PREFIX)) {
      errors.push(`Address must start with '${WALLET_ADDRESS_PREFIX}'`);
    }

    // Check length
    if (address.length !== WALLET_ADDRESS_LENGTH) {
      errors.push(`Address must be exactly ${WALLET_ADDRESS_LENGTH} characters long (got ${address.length})`);
    }

    // Check format
    if (!WALLET_ADDRESS_REGEX.test(address)) {
      errors.push('Address contains invalid characters or format');
    }

    // Check for common mistakes
    if (address.includes('0') || address.includes('1') || address.includes('8') || address.includes('9')) {
      errors.push('Address contains invalid characters (0, 1, 8, 9 are not allowed in Stellar addresses)');
    }

    if (address.includes('O') || address.includes('I')) {
      errors.push('Address contains invalid characters (O, I are not allowed in Stellar addresses)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Error during wallet address validation', error, 'WalletValidation');
    errors.push('Unexpected error during validation');
    return { isValid: false, errors };
  }
};

// Validate wallet name
export const validateWalletName = (name: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  try {
    if (!name || typeof name !== 'string') {
      errors.push('Wallet name is required and must be a string');
      return { isValid: false, errors };
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      errors.push('Wallet name cannot be empty');
    }

    if (trimmedName.length < 2) {
      errors.push('Wallet name must be at least 2 characters long');
    }

    if (trimmedName.length > 50) {
      errors.push('Wallet name cannot exceed 50 characters');
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      errors.push('Wallet name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Error during wallet name validation', error, 'WalletValidation');
    errors.push('Unexpected error during validation');
    return { isValid: false, errors };
  }
};

// Validate asset code
export const validateAssetCode = (assetCode: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  try {
    if (!assetCode || typeof assetCode !== 'string') {
      errors.push('Asset code is required and must be a string');
      return { isValid: false, errors };
    }

    const trimmedCode = assetCode.trim();

    if (trimmedCode.length === 0) {
      errors.push('Asset code cannot be empty');
    }

    if (trimmedCode.length > 12) {
      errors.push('Asset code cannot exceed 12 characters');
    }

    // Check for valid characters (alphanumeric and some special chars)
    const validChars = /^[A-Z0-9\-_]+$/;
    if (!validChars.test(trimmedCode)) {
      errors.push('Asset code contains invalid characters (only uppercase letters, numbers, hyphens, and underscores allowed)');
    }

    // Check for reserved asset codes
    const reservedCodes = ['XLM', 'NATIVE'];
    if (reservedCodes.includes(trimmedCode.toUpperCase())) {
      errors.push(`Asset code '${trimmedCode}' is reserved`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Error during asset code validation', error, 'WalletValidation');
    errors.push('Unexpected error during validation');
    return { isValid: false, errors };
  }
};

// Validate asset issuer
export const validateAssetIssuer = (issuer: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  try {
    if (!issuer || typeof issuer !== 'string') {
      errors.push('Asset issuer is required and must be a string');
      return { isValid: false, errors };
    }

    // Use the same validation as wallet address
    const walletValidation = validateWalletAddress(issuer);
    if (!walletValidation.isValid) {
      errors.push(...walletValidation.errors.map(error => `Issuer: ${error}`));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Error during asset issuer validation', error, 'WalletValidation');
    errors.push('Unexpected error during validation');
    return { isValid: false, errors };
  }
};
