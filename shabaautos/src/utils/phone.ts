/**
 * Tolerant Nigerian Phone Number Normalization Utility
 *
 * Normalizes user inputs such as:
 * - 0803 123 4567
 * - 08031234567
 * - +234 803 123 4567
 * - 2348031234567
 * - (0803) 123-4567
 *
 * Output: +2348031234567 (E.164 representation)
 */

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

export function normalizeNigerianPhone(input: string | null | undefined): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      error: 'Phone number is required.',
    };
  }

  // Strip all whitespace, dashes, parentheses, dots, and trailing/leading commas
  const cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '');

  if (!cleaned) {
    return {
      valid: false,
      error: 'Phone number cannot be empty.',
    };
  }

  let nationalNumber = '';

  if (cleaned.startsWith('+234')) {
    nationalNumber = cleaned.slice(4);
  } else if (cleaned.startsWith('234')) {
    nationalNumber = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    nationalNumber = cleaned.slice(1);
  } else {
    nationalNumber = cleaned;
  }

  // Remove any remaining non-digit characters
  nationalNumber = nationalNumber.replace(/\D/g, '');

  // A valid Nigerian mobile number has exactly 10 national digits (e.g., 8031234567)
  if (nationalNumber.length !== 10) {
    return {
      valid: false,
      error: `Invalid Nigerian phone length. Expected 10 digits after prefix (got ${nationalNumber.length}).`,
    };
  }

  // Nigerian telecom carrier prefixes typically start with 7, 8, or 9
  const firstDigit = nationalNumber[0];
  if (!['7', '8', '9'].includes(firstDigit)) {
    return {
      valid: false,
      error: 'Invalid Nigerian carrier prefix. Number should begin with 070, 080, 081, 090, or 091 series.',
    };
  }

  const normalized = `+234${nationalNumber}`;
  return {
    valid: true,
    normalized,
  };
}

export function isValidNigerianPhone(input: string | null | undefined): boolean {
  return normalizeNigerianPhone(input).valid;
}
