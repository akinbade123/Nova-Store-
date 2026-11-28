import {
  EMAIL_PATTERN,
  cardBrand,
  countryByCode,
  validateCardNumber,
  validateCvc,
  validateExpiry,
  validatePhone,
  validatePostal,
} from '../../utils/validation.js';

/** Address field name, optionally prefixed: ('billing', 'city') -> 'billingCity'. */
export const addressField = (prefix, key) => (prefix ? `${prefix}${key[0].toUpperCase()}${key.slice(1)}` : key);

export const emptyAddress = (prefix = '') => ({
  [addressField(prefix, 'firstName')]: '',
  [addressField(prefix, 'lastName')]: '',
  [addressField(prefix, 'address1')]: '',
  [addressField(prefix, 'address2')]: '',
  [addressField(prefix, 'city')]: '',
  [addressField(prefix, 'region')]: '',
  [addressField(prefix, 'postalCode')]: '',
  [addressField(prefix, 'country')]: 'US',
});

export const initialCheckoutValues = {
  email: '',
  phone: '',
  marketing: true,
  ...emptyAddress(),
  shippingMethod: 'standard',
  paymentMethod: 'card',
  cardNumber: '',
  cardExpiry: '',
  cardCvc: '',
  cardName: '',
  billingSame: true,
  ...emptyAddress('billing'),
};

/** Fields saved as a draft so a refresh doesn't lose them. Card details are never stored. */
export const DRAFT_FIELDS = Object.keys(initialCheckoutValues).filter((name) => !name.startsWith('card'));

export function validateAddress(values, prefix, errors) {
  const f = (key) => addressField(prefix, key);
  const country = countryByCode(values[f('country')]);
  if (!values[f('firstName')].trim()) errors[f('firstName')] = 'Enter a first name';
  if (!values[f('lastName')].trim()) errors[f('lastName')] = 'Enter a last name';
  if (values[f('address1')].trim().length < 4) errors[f('address1')] = 'Enter a street address';
  if (!values[f('city')].trim()) errors[f('city')] = 'Enter a city';
  if (country.regionRequired && !values[f('region')].trim()) errors[f('region')] = `Enter a ${country.regionLabel.toLowerCase()}`;
  const postal = validatePostal(values[f('postalCode')], country.code);
  if (postal) errors[f('postalCode')] = postal;
}

/** Validation for the whole checkout form. Order of keys = order shown in the error summary. */
export function validateCheckout(values) {
  const errors = {};

  if (!values.email.trim()) errors.email = 'Enter an email address';
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email, like name@example.com';
  const phone = validatePhone(values.phone);
  if (phone) errors.phone = phone;

  validateAddress(values, '', errors);

  if (values.paymentMethod === 'card') {
    const number = validateCardNumber(values.cardNumber);
    if (number) errors.cardNumber = number;
    const expiry = validateExpiry(values.cardExpiry);
    if (expiry) errors.cardExpiry = expiry;
    const cvc = validateCvc(values.cardCvc, cardBrand(values.cardNumber));
    if (cvc) errors.cardCvc = cvc;
    if (values.cardName.trim().length < 2) errors.cardName = 'Enter the name shown on your card';
    if (!values.billingSame) validateAddress(values, 'billing', errors);
  }

  return errors;
}

export function pickAddress(values, prefix = '') {
  const f = (key) => values[addressField(prefix, key)].trim();
  return {
    firstName: f('firstName'),
    lastName: f('lastName'),
    address1: f('address1'),
    address2: f('address2'),
    city: f('city'),
    region: f('region'),
    postalCode: f('postalCode').toUpperCase(),
    country: values[addressField(prefix, 'country')],
  };
}
