import { randomBytes } from 'node:crypto';

// The one generator for an invitation's token, on either tier. Not beside `hashToken`, as a service may not import the repository's internals, nor in a module,
// as both identity and coven mint one (claude-docs/db/invitations.md, "Written and read by tier").

/**
 * 32 bytes from the CSPRNG, base64url: 256 bits, unguessable, and safe in a
 * path. Never `Math.random()` (CLAUDE.md, "Invitation tokens").
 */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Letters and digits without `0`, `O`, `1`, `l` and `I`, which look alike when printed on a card and typed by hand. */
export const CARD_TOKEN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const CARD_TOKEN_LENGTH = 16;
// The largest multiple of the alphabet's size within a byte: a byte at or past it is skipped, as folding it back
// with `%` would make the first symbols likelier than the rest.
const UNBIASED_LIMIT = Math.floor(256 / CARD_TOKEN_ALPHABET.length) * CARD_TOKEN_ALPHABET.length;

/**
 * A card's token: 16 symbols of `CARD_TOKEN_ALPHABET`, about 93 bits, short enough for a sparse QR code. Each
 * symbol is a `crypto.randomBytes` byte kept only below `UNBIASED_LIMIT`; never `Math.random()` and never `%` alone.
 */
export function newCardToken(): string {
  let token = '';
  while (token.length < CARD_TOKEN_LENGTH) {
    for (const byte of randomBytes(CARD_TOKEN_LENGTH * 2)) {
      if (byte >= UNBIASED_LIMIT) continue;
      token += CARD_TOKEN_ALPHABET[byte % CARD_TOKEN_ALPHABET.length];
      if (token.length === CARD_TOKEN_LENGTH) break;
    }
  }
  return token;
}
