import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { getMe } from './profile';
import type { PasswordSetter } from '../types';

// A first password for an account that signs in only through providers. Better Auth holds the password and
// hashes it, so the write is its own, through the setter, and outside `withAudit` as every write to its
// `accounts` table is (claude-docs/auth/passwords.md, "Setting a first password").

/**
 * Gives the session's own account `newPassword`, through `setter`, which is bound to this request's cookie, so
 * the only account a caller can name is their own. A provisional account is refused, as it is by every
 * service but `me` and `setEmail`.
 *
 * @throws {Forbidden} the account's address is not yet verified — checked before the setter is called.
 * @throws {ValidationError} on `newPassword`, from the setter.
 */
export async function setPassword(
  session: Session,
  newPassword: string,
  setter: PasswordSetter,
): Promise<boolean> {
  const me = await getMe(session);
  if (!me.emailVerified) throw new Forbidden('Confirm your email address first');
  await setter.set(newPassword);
  return true;
}
