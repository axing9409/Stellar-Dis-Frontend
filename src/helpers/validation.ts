/**
 * Data validation utilities
 */

import { logger } from './logger';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

class Validator {
  /**
   * Validate a single value against a rule
   */
  private validateValue(value: any, rule: ValidationRule): string[] {
    const errors: string[] = [];

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(rule.message || 'This field is required');
      return errors;
    }

    // Skip other validations if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // Type check for string validations
    if (typeof value === 'string') {
      // Length validations
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(rule.message || `Minimum length is ${rule.minLength} characters`);
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(rule.message || `Maximum length is ${rule.maxLength} characters`);
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.message || 'Invalid format');
      }
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (result === false) {
        errors.push(rule.message || 'Invalid value');
      } else if (typeof result === 'string') {
        errors.push(result);
      }
    }

    return errors;
  }

  /**
   * Validate an object against a schema
   */
  validate(data: any, schema: ValidationSchema): ValidationResult {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(schema)) {
      const fieldErrors = this.validateValue(data[field], rule);
      errors.push(...fieldErrors.map(error => `${field}: ${error}`));
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors
    };

    if (!result.isValid) {
      logger.warn('Validation failed', { data, errors }, 'Validation');
    }

    return result;
  }

  /**
   * Validate a single field
   */
  validateField(value: any, rule: ValidationRule): ValidationResult {
    const errors = this.validateValue(value, rule);
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const validator = new Validator();

// Common validation rules
export const validationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message
  }),

  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || 'Invalid email format'
  }),

  phone: (message?: string): ValidationRule => ({
    pattern: /^\+?[\d\s\-\(\)]+$/,
    message: message || 'Invalid phone number format'
  }),

  url: (message?: string): ValidationRule => ({
    pattern: /^https?:\/\/.+/,
    message: message || 'Invalid URL format'
  }),

  stellarAddress: (message?: string): ValidationRule => ({
    pattern: /^G[A-Z2-7]{55}$/,
    message: message || 'Invalid Stellar address format'
  }),

  amount: (message?: string): ValidationRule => ({
    custom: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0;
    },
    message: message || 'Amount must be a positive number'
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `Minimum length is ${length} characters`
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `Maximum length is ${length} characters`
  })
};

// Predefined schemas for common forms
export const schemas = {
  userProfile: {
    firstName: validationRules.required('First name is required'),
    lastName: validationRules.required('Last name is required'),
    email: validationRules.email(),
    phone: validationRules.phone()
  },

  disbursement: {
    name: validationRules.required('Disbursement name is required'),
    description: validationRules.maxLength(500, 'Description too long'),
    amount: validationRules.amount()
  },

  apiKey: {
    name: validationRules.required('API key name is required'),
    permissions: validationRules.required('Permissions are required')
  }
};
