import 'server-only';
import { withAudit } from '../../../db/repository';
import { NotFound, fieldRefusal } from '../../../lib/errors';
import { currentTermsVersion } from '../../../lib/current-terms-version';
import type { Session } from '../../../lib/session';
import { TERMS_VERSION } from '../../../lib/terms-version';
import { users } from '../schema/users';
import type { UserRow } from '../types';

// Which version of the terms of use an account has agreed to: the number of the terms document's published version it was shown
// (claude-docs/auth/admin-bootstrap.md, "The terms page").

/** Whether `agreed`, the number an account recorded, is the number `current` in force. */
export function hasAgreedToTerms(agreed: number | null | undefined, current: number): boolean {
  return (agreed ?? 0) === current;
}

/**
 * Records that the session's own account agreed to terms version `version`, now. It takes no id, so the only row a caller can name
 * is their own, and it refuses a version that is not the one in force, so a page left open across a publish cannot agree to text it
 * did not show.
 *
 * @throws {ValidationError} `version` is not the version in force.
 * @throws {NotFound} the row is gone, though the session outlives it.
 */
export async function agreeToTerms(session: Session, version: number): Promise<UserRow> {
  if (version !== (await currentTermsVersion())) {
    throw fieldRefusal(
      'version',
      'The terms changed while you were reading them. Reload the page and read the new version.',
    );
  }
  const [row] = await withAudit(session, (write) =>
    write.updateById(users, session.userId, {
      agreedTermsVersion: version,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
    }),
  );
  if (!row) throw new NotFound();
  return row;
}
