import { and, eq, gt, isNull, sql, type SQL } from 'drizzle-orm';
import { adminInvitations } from '../../modules/identity/schema/admin-invitations';
import { users } from '../../modules/identity/schema/users';
import type { AuditSession } from '../types';
import { notSoftDeleted } from './predicates';
import { existsIn, selectFrom } from './select';
import { hashToken } from './tokens';
import type { AdminInvitationRow, AuditWriter, WriterContext } from './types';

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

// A pending invitation: neither accepted nor revoked, and not yet expired.
// Both stamps match only one, so neither overwrites the other or itself.
function pendingInvitation(...which: SQL[]) {
  return and(
    ...which,
    isNull(adminInvitations.acceptedAt),
    isNull(adminInvitations.revokedAt),
    gt(adminInvitations.expiresAt, sql`now()`),
  );
}

// The session's user holds the invited address, verified, on a live row.
// Both sides lowered, though `users` holds its addresses lower-cased.
function heldVerifiedBySession(session: AuditSession) {
  return existsIn(
    users,
    and(
      eq(users.id, session.userId),
      eq(users.emailVerified, true),
      eq(sql`lower(${users.email})`, sql`lower(${adminInvitations.email})`),
    ),
  );
}

/**
 * The admin invitation's three named writes (MB.69), beside its finder
 * rather than in `write.ts`: the table is marked `namedWrites`, so these are
 * the only writes it takes, and `writerFor` spreads them into the writer
 * (MB.198).
 */
export function adminInvitationWrites({
  session,
  insert,
  update,
}: WriterContext): Pick<
  AuditWriter,
  'insertAdminInvitation' | 'acceptAdminInvitation' | 'revokeAdminInvitation'
> {
  return {
    // The columns named rather than spread, as `workspaceId` is placed last
    // in `insertInWorkspace`: an invitation starts pending even if a cast
    // smuggled a stamp in.
    insertAdminInvitation: (_admin, { email, token, expiresAt, note }) =>
      insert(adminInvitations, { email, tokenHash: hashToken(token), expiresAt, note }),
    // The address match in the statement, not only in MB.70's service: the
    // service checks first to say why, and this is what holds if it forgot.
    acceptAdminInvitation: (token) =>
      update(
        adminInvitations,
        { acceptedAt: sql`now()`, acceptedBy: session.userId },
        pendingInvitation(
          eq(adminInvitations.tokenHash, hashToken(token)),
          heldVerifiedBySession(session),
        ),
      ),
    revokeAdminInvitation: (_admin, id) =>
      update(
        adminInvitations,
        { revokedAt: sql`now()` },
        pendingInvitation(eq(adminInvitations.id, id)),
      ),
  };
}
