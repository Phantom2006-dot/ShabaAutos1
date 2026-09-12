/**
 * Server-side Nigerian Phone Normalization
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

  nationalNumber = nationalNumber.replace(/\D/g, '');

  if (nationalNumber.length !== 10) {
    return {
      valid: false,
      error: `Invalid Nigerian phone length. Expected 10 digits after prefix (got ${nationalNumber.length}).`,
    };
  }

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
