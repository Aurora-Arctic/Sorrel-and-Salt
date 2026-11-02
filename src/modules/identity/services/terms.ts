import 'server-only';
import { withAudit } from '../../../db/repository';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { TERMS_VERSION } from '../../../lib/terms-version';
import { users } from '../schema/users';
import type { UserRow } from '../types';

// Which version of the terms of use an account has agreed to. The version is always the constant: a caller names no version,
// so an account cannot claim one it was never shown (claude-docs/auth/admin-bootstrap.md, "The terms page").

/**
 * Whether `stored` is the version in force. `current` is a parameter only so a test can raise it; callers leave it alone.
 */
export function hasAgreedToTerms(
  stored: string | null | undefined,
  current: string = TERMS_VERSION,
): boolean {
  return stored === current;
}

/**
 * Records that the session's own account agreed to the current terms, now. It takes no id and no version, so the only row a
 * caller can name is their own, at the one version in force.
 *
 * @throws {NotFound} the row is gone, though the session outlives it.
 */
export async function agreeToTerms(session: Session): Promise<UserRow> {
  const [row] = await withAudit(session, (write) =>
    write.updateById(users, session.userId, {
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
    }),
  );
  if (!row) throw new NotFound();
  return row;
}
