// Tidying shared by the forms and the server schemas: the form shows exactly what the server will store.
// Pure and client-safe. A format changes only what it can read with certainty and leaves the rest as typed.

import { QUANTITY_SCALE } from '../modules/ingredients/schema/quantities';

export type FieldFormat = (text: string) => string;

/** Single-line text with its ends trimmed and each run of white space made one space. Never for multiline text, whose line breaks matter. */
export const tidy: FieldFormat = (text) => text.replace(/\s+/g, ' ').trim();

const SCHEME = /^[a-z][a-z\d+.-]*:/i;

/** Whether text opens with a scheme such as `https:` or `mailto:`. */
export const hasScheme = (text: string): boolean => SCHEME.test(text);
const BARE_HOST = /^[\w-]+(\.[\w-]+)+([/?#]|$)/;

/** A web address with `https://` put in front when it has no scheme and plainly starts with a host name. */
export const withScheme: FieldFormat = (text) =>
  !hasScheme(text) && BARE_HOST.test(text) ? `https://${text}` : text;

/** Text with only its ends trimmed, for multiline text, whose line breaks and spacing belong to the person. */
export const trimEnds: FieldFormat = (text) => text.trim();

/** What a form says when text runs past a soft limit; the schema's `.max` carries the same words, so the form and the server agree. */
export const limitMessage = (limit: number): string =>
  `Keep this to ${limit.toLocaleString('en-US')} characters or fewer`;

const AMOUNT = /^-?(\d+\.?\d*|\.\d+)$/;

/** An amount typed as digits with at most one point, commas dropped as thousands separators ("2,5" reads as 25): its number, null for blank, NaN for anything else (letters, two points, an exponent), which the quantity rule refuses. */
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const plain = trimmed.replace(/,/g, '');
  return AMOUNT.test(plain) ? Number(plain) : Number.NaN;
}

/** A stored amount as a form shows it: thousands separators, no padded decimals (1234567.5 is "1,234,567.5"). */
export const showQuantity = (amount: number): string =>
  String(amount).includes('e')
    ? String(amount)
    : amount.toLocaleString('en-GB', { maximumFractionDigits: QUANTITY_SCALE });

/** An amount shown with thousands separators ("1000" becomes "1,000"); what it cannot read, or could show only rounded, stays as typed. */
export const formatQuantity: FieldFormat = (text) => {
  const amount = parseQuantity(text);
  if (amount === null) return '';
  const exact =
    !Number.isNaN(amount) &&
    !String(amount).includes('e') &&
    Number(amount.toFixed(QUANTITY_SCALE)) === amount;
  return exact ? showQuantity(amount) : text.trim();
};

/**
 * Formatting while the person types (Field's `mask`). `format` lays out the whole text; `isSignificant`
 * says which characters the person typed, as opposed to the ones `format` adds (the brackets and
 * spaces of a phone number), so the caret can stay beside the same character.
 */
export interface FieldMask {
  format: FieldFormat;
  isSignificant: (character: string) => boolean;
}
