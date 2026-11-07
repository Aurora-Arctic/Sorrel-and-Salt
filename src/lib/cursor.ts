import { InvalidCursor } from './errors';
import type { Cursor } from './types';

// The page sizes and the cursor codec, which the browser reads too: a hand-edited cursor in an address is checked before it is
// sent. Apart from `pagination.ts`, which builds pages with the schema builder, so the browser never loads the server's packages,
// and in `btoa` and `TextEncoder` rather than `Buffer`, which the browser would need a copy of. claude-docs/graphql/pagination.md.

export const DEFAULT_PAGE_SIZE = 25;
/** What a card list pages by: 24 divides by 1, 2, 3 and 4 columns, so the last row of the grid is full. */
export const CARD_PAGE_SIZE = 24;
/** The hard server-side maximum. A client asking for more gets this many, not an error. */
export const MAX_PAGE_SIZE = 100;

function toBase64Url(text: string): string {
  const binary = Array.from(new TextEncoder().encode(text), (byte) =>
    String.fromCharCode(byte),
  ).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The text a base64url string holds; throws on one that is not base64 or not UTF-8. */
function fromBase64Url(encoded: string): string {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function encodeCursor({ key, id }: Cursor): string {
  return toBase64Url(JSON.stringify({ k: key, i: id }));
}

export function decodeCursor(cursor: string): Cursor {
  let decoded: unknown;
  try {
    decoded = JSON.parse(fromBase64Url(cursor));
  } catch {
    throw new InvalidCursor();
  }
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    !('k' in decoded) ||
    !('i' in decoded) ||
    !Array.isArray(decoded.k) ||
    decoded.k.length === 0 ||
    !decoded.k.every((part) => typeof part === 'string') ||
    typeof decoded.i !== 'string' ||
    decoded.i === ''
  ) {
    throw new InvalidCursor();
  }
  return { key: decoded.k as string[], id: decoded.i };
}
