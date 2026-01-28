/**
 * Authentication and Member Configuration
 */

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authConfig = {
  // Password hashing
  saltRounds: 10,
  minPasswordLength: 4,

  // Valid member roles
  validRoles: ['School Admin', 'SLP', 'Parent', 'Student'] as const,

  // Email validation
  isValidEmail: (email: string): boolean => EMAIL_REGEX.test(email),
};

export type ValidRole = typeof authConfig.validRoles[number];
