export const LAST_WAY_IN =
  'This passkey is your only way to sign in, so it cannot be removed. Add another way first.';
export const GENERIC = 'That did not work. Try again.';

/** The sentence for a refused call: the last-way-in rule by its code, anything else generically. */
export const refusal = (code: unknown): string =>
  code === 'LAST_SIGN_IN_METHOD' ? LAST_WAY_IN : GENERIC;
