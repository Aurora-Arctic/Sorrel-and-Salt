import 'server-only';
/** What stands where an invitation's token was: a token is a credential. */
export const TOKEN_PLACEHOLDER = '[token]';

/**
 * The page address as a request stores it: no query string or fragment, and the segment after `/invite/` replaced by a
 * placeholder, being a credential. A coven's slug stays, so a reviewer can tell which coven the page was. Blank or absent is
 * `''`, the column being not null.
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
