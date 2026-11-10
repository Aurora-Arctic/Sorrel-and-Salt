import { GENERIC_FAILURE } from '../../lib/graphql-failure';

export const LAST_WAY_IN =
  'This passkey is your only way to sign in, so it cannot be removed. Add another way first.';

export const refusal = (code: unknown): string =>
  code === 'LAST_SIGN_IN_METHOD' ? LAST_WAY_IN : GENERIC_FAILURE;
