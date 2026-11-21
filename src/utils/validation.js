export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const COUNTRIES = [
  { code: 'US', name: 'United States', regionLabel: 'State', regionRequired: true, postalLabel: 'ZIP code' },
  { code: 'GB', name: 'United Kingdom', regionLabel: 'County', regionRequired: false, postalLabel: 'Postcode' },
  { code: 'CA', name: 'Canada', regionLabel: 'Province', regionRequired: true, postalLabel: 'Postal code' },
  { code: 'NG', name: 'Nigeria', regionLabel: 'State', regionRequired: true, postalLabel: 'Postal code' },
  { code: 'GH', name: 'Ghana', regionLabel: 'Region', regionRequired: true, postalLabel: 'Postal code' },
  { code: 'KE', name: 'Kenya', regionLabel: 'County', regionRequired: false, postalLabel: 'Postal code' },
  { code: 'ZA', name: 'South Africa', regionLabel: 'Province', regionRequired: true, postalLabel: 'Postal code' },
  { code: 'IE', name: 'Ireland', regionLabel: 'County', regionRequired: false, postalLabel: 'Eircode' },
  { code: 'DE', name: 'Germany', regionLabel: 'State', regionRequired: false, postalLabel: 'Postal code' },
  { code: 'FR', name: 'France', regionLabel: 'Region', regionRequired: false, postalLabel: 'Postal code' },
  { code: 'NL', name: 'Netherlands', regionLabel: 'Province', regionRequired: false, postalLabel: 'Postal code' },
  { code: 'AU', name: 'Australia', regionLabel: 'State', regionRequired: true, postalLabel: 'Postcode' },
];

export const countryByCode = (code) => COUNTRIES.find((country) => country.code === code) ?? COUNTRIES[0];

const POSTAL_PATTERNS = {
  US: /^\d{5}(-\d{4})?$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
  CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
  NG: /^\d{6}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  NL: /^\d{4}\s?[A-Z]{2}$/i,
  AU: /^\d{4}$/,
  ZA: /^\d{4}$/,
};

/** Countries where many addresses have no postal code. */
const POSTAL_OPTIONAL = ['NG', 'GH', 'KE', 'IE'];

export function isPostalOptional(countryCode) {
  return POSTAL_OPTIONAL.includes(countryCode);
}

export function validatePostal(value, countryCode) {
  const trimmed = (value ?? '').trim();
  const { postalLabel } = countryByCode(countryCode);
  // Keep acronyms like ZIP capitalised.
  const label = postalLabel.startsWith('ZIP') ? postalLabel : postalLabel.toLowerCase();
  if (!trimmed) return isPostalOptional(countryCode) ? null : `Enter a ${label}`;
  const pattern = POSTAL_PATTERNS[countryCode];
  if (pattern ? !pattern.test(trimmed) : trimmed.length < 3 || trimmed.length > 10) {
    return `Enter a valid ${label}`;
  }
  return null;
}

export function validatePhone(value) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return 'Enter a phone number for delivery updates';
  if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number';
  return null;
}

/* ------------------------------------------------------------------ */
/* Payment cards                                                       */
/* ------------------------------------------------------------------ */

export function cardBrand(number) {
  const digits = (number ?? '').replace(/\D/g, '');
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  return null;
}

export const BRAND_LABELS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

/** Groups digits as the card brand prints them: 4-4-4-4, or 4-6-5 for Amex. */
export function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '');
  if (cardBrand(digits) === 'amex') {
    const d = digits.slice(0, 15);
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(' ');
  }
  return digits.slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** "1" → "1", "4" → "04 / ", "123" → "12 / 3". Backspacing over the separator removes it. */
export function formatExpiry(value, previous = '') {
  let digits = value.replace(/\D/g, '').slice(0, 4);
  const deleting = value.length < previous.length;
  if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;
  if (digits.length < 2) return digits;
  if (deleting && digits.length === 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function passesLuhn(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(value) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return 'Enter your card number';
  if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) return 'Enter a valid card number';
  if (!cardBrand(digits)) return 'We accept Visa, Mastercard and American Express';
  return null;
}

export function validateExpiry(value, now = new Date()) {
  const match = (value ?? '').replace(/\s/g, '').match(/^(\d{2})\/(\d{2})$/);
  if (!value?.trim()) return 'Enter the expiry date';
  if (!match) return 'Use the format MM / YY';
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return 'Enter a valid month';
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  if (endOfMonth < now) return 'This card has expired';
  if (year > now.getFullYear() + 20) return 'Enter a valid expiry year';
  return null;
}

export function validateCvc(value, brand) {
  const digits = (value ?? '').replace(/\D/g, '');
  const length = brand === 'amex' ? 4 : 3;
  if (!digits) return 'Enter the security code';
  if (digits.length !== length) return `Enter the ${length}-digit security code`;
  return null;
}
