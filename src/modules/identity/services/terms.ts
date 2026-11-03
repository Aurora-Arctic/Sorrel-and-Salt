import 'server-only';
import { withAudit } from '../../../db/repository';
import { agreementIsCurrent } from '../../../lib/agreement-version';
import { NotFound, fieldRefusal } from '../../../lib/errors';
import { currentAgreementVersion } from '../../../lib/current-agreement-version';
import type { Session } from '../../../lib/session';
import type { AgreementVersion } from '../../../lib/types';
import { users } from '../schema/users';
import type { UserRow } from '../types';

// Which versions of the terms of use, the disclaimer and the code of ethics an account has agreed to, all three at once, since the
// terms include the other two (claude-docs/auth/admin-bootstrap.md, "The terms page").

/**
 * Records that the session's own account agreed to the three versions in `version`, now. It takes no id, so the only row a caller
 * can name is their own, and it refuses any combination but the one in force, so a page left open across a publish cannot agree to
 * text it did not show.
 *
 * @throws {ValidationError} `version` is not the combination in force.
 * @throws {NotFound} the row is gone, though the session outlives it.
 */
export async function agreeToTerms(session: Session, version: AgreementVersion): Promise<UserRow> {
  if (!agreementIsCurrent(version, await currentAgreementVersion())) {
    throw fieldRefusal(
      'version',
      'The terms changed while you were reading them. Reload the page and read the new version.',
    );
  }
  const [row] = await withAudit(session, (write) =>
    write.updateById(users, session.userId, {
      agreedTermsVersion: version.terms,
      agreedDisclaimerVersion: version.disclaimer,
      agreedEthicsVersion: version.ethics,
      termsAcceptedAt: new Date(),
    }),
  );
  if (!row) throw new NotFound();
  return row;
}
