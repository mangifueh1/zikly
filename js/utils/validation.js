export function isCameroonPhone(value) {
  const digits = String(value).replace(/\D/g, "");
  return /^(237)?(6\d{8}|2\d{8})$/.test(digits);
}

export function normalizePhone(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits.startsWith("237") ? digits : `237${digits}`;
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
