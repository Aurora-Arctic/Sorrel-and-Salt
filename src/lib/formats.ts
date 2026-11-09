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
