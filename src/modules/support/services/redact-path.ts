import 'server-only';
/** What stands where a coven's slug was: a support request names the screen, never whose coven. */
export const COVEN_PLACEHOLDER = '[coven]';
/** What stands where an invitation's token was: a token is a credential. */
export const TOKEN_PLACEHOLDER = '[token]';

/**
 * The page address as a request stores it: no query string or fragment, the segment after `/coven/` replaced by a fixed
 * placeholder, and the one after `/invite/` too. Blank or absent is `''`, the column being not null.
 */
export function redactPath(path: string | null | undefined): string {
  const trimmed = path?.trim() ?? '';
  if (!trimmed) return '';
  const bare = trimmed.split(/[?#]/, 1)[0] ?? '';
  return bare
    .split('/')
    .map((segment, i, all) => {
      if (all[i - 1] === 'coven' && segment) return COVEN_PLACEHOLDER;
      if (all[i - 1] === 'invite' && segment) return TOKEN_PLACEHOLDER;
      return segment;
    })
    .join('/');
}
