import { and, eq } from 'drizzle-orm';
import { adminInvitations } from '../../modules/identity/schema/admin-invitations';
import { notSoftDeleted } from './predicates';
import { selectFrom } from './select';
import { hashToken } from './tokens';
import type { AdminInvitationRow } from './types';

/**
 * The live invitation a link's token names, or `undefined` (MB.69): what
 * MB.70's acceptance reads. Under no role's proof, since the invitee is not
 * yet an admin; holding the token is what admits, and the hash it is matched
 * as is taken here, so a dumped row's hash finds nothing. Expired, revoked
 * and accepted rows come back alike, so the service can tell the three apart.
 */
export async function findAdminInvitationByToken(
  token: string,
): Promise<AdminInvitationRow | undefined> {
  const [row] = await selectFrom(
    adminInvitations,
    and(notSoftDeleted(adminInvitations), eq(adminInvitations.tokenHash, hashToken(token))),
  );
  return row;
}
