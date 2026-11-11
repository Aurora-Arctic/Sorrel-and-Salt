import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { UserRow } from '../types';

/** @throws {Forbidden} the account's address is unverified. */
export function assertEmailConfirmed(me: Pick<UserRow, 'emailVerified'>): void {
  if (!me.emailVerified) throw new Forbidden('Confirm your email address first');
}
