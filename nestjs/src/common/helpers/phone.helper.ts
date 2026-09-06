/**
 * Iranian mobile number handling for the OTP login.
 *
 * Every entry point (login form, guardian creation, player file, staff account)
 * runs numbers through `normalizePhone` so the same person is recognised
 * whether they type ۰۹۱۲…, 0912…, +98912… or 98912….
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Converts Persian/Arabic digits to Latin and strips separators. */
export function toLatinDigits(input: string): string {
  let out = '';
  for (const ch of String(input ?? '')) {
    const p = PERSIAN_DIGITS.indexOf(ch);
    const a = ARABIC_DIGITS.indexOf(ch);
    if (p >= 0) out += String(p);
    else if (a >= 0) out += String(a);
    else out += ch;
  }
  return out;
}

/**
 * Canonical form: 11 digits starting with 09 (e.g. 09121234567).
 * Returns the cleaned input unchanged when it is not an Iranian mobile number,
 * so foreign or landline numbers are still stored consistently.
 */
export function normalizePhone(input: string | null | undefined): string {
  let s = toLatinDigits(String(input ?? '')).replace(/[\s\-()]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  else if (s.startsWith('9') && s.length === 10) s = '0' + s;
  return s;
}

/** True for a valid Iranian mobile number. */
export function isValidMobile(input: string | null | undefined): boolean {
  return /^09\d{9}$/.test(normalizePhone(input));
}

/** 0912***4567 — used in the OTP screen and the SMS log UI. */
export function maskPhone(input: string | null | undefined): string {
  const p = normalizePhone(input);
  if (p.length < 7) return p;
  return `${p.slice(0, 4)}***${p.slice(-4)}`;
}
