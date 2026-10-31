import 'server-only';
/** What stands where a coven's slug was, in what a curator reads: a curator is told the screen, never whose coven. */
export const COVEN_PLACEHOLDER = '[coven]';
/** What stands where an invitation's token was: a token is a credential. */
export const TOKEN_PLACEHOLDER = '[token]';

/**
 * The page address as a request stores it: no query string or fragment, and the segment after `/invite/` replaced by a
 * placeholder, being a credential. A coven's slug stays, since the row keeps the real page. Blank or absent is `''`, the
 * column being not null.
 */
export function redactPath(path: string | null | undefined): string {
  const trimmed = path?.trim() ?? '';
  if (!trimmed) return '';
  const bare = trimmed.split(/[?#]/, 1)[0] ?? '';
  return bare
    .split('/')
    .map((segment, i, all) => {
      if (all[i - 1] === 'invite' && segment) return TOKEN_PLACEHOLDER;
      return segment;
    })
    .join('/');
}

/** The stored page as a curator reads it: the segment after `/coven/` replaced by a placeholder. */
export function redactPathForCurator(path: string): string {
  return path
    .split('/')
    .map((segment, i, all) => (all[i - 1] === 'coven' && segment ? COVEN_PLACEHOLDER : segment))
    .join('/');
}
