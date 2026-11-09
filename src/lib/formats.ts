// Tidying shared by the forms and the server schemas: the form shows exactly what the server will store.
// Pure and client-safe. A format changes only what it can read with certainty and leaves the rest as typed.

export type FieldFormat = (text: string) => string;

/** Single-line text with its ends trimmed and each run of white space made one space. Never for multiline text, whose line breaks matter. */
export const tidy: FieldFormat = (text) => text.replace(/\s+/g, ' ').trim();

const SCHEME = /^[a-z][a-z\d+.-]*:/i;
const BARE_HOST = /^[\w-]+(\.[\w-]+)+([/?#]|$)/;

/** A web address with `https://` put in front when it has no scheme and plainly starts with a host name. */
export const withScheme: FieldFormat = (text) =>
  !SCHEME.test(text) && BARE_HOST.test(text) ? `https://${text}` : text;

/** Text with only its ends trimmed, for multiline text, whose line breaks and spacing belong to the person. */
export const trimEnds: FieldFormat = (text) => text.trim();

/** What a form says when text runs past a soft limit; the schema's `.max` carries the same words, so the form and the server agree. */
export const limitMessage = (limit: number): string =>
  `Keep this to ${limit.toLocaleString('en-US')} characters or fewer`;

const AMOUNT = /^-?(\d+[.,]?\d*|[.,]\d+)$/;

/** An amount typed with a point or a comma: its number, null for blank, NaN for anything else (letters, two marks, an exponent), which the quantity rule refuses. */
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return AMOUNT.test(trimmed) ? Number(trimmed.replace(',', '.')) : Number.NaN;
}

/** An amount shown as its canonical number ("2,5" becomes "2.5"); what it cannot read stays as typed. */
export const formatQuantity: FieldFormat = (text) => {
  const amount = parseQuantity(text);
  if (amount === null) return '';
  const canonical = String(amount);
  return Number.isNaN(amount) || canonical.includes('e') ? text.trim() : canonical;
};
