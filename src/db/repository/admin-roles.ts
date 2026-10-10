import { and, eq, isNull, sql } from 'drizzle-orm';
import { applyAudit } from '../audit';
import { adminRoleChangePauses } from '../../modules/identity/schema/admin-role-change-pauses';
import { users } from '../../modules/identity/schema/users';
import type { SiteAdmin } from '@/modules/identity';
import { notSoftDeleted } from './predicates';
import { selectFrom } from './select';
import type { AuditWriter, SiteInvitationRow, WriterContext } from './types';

/**
 * The open pause on admin role changes, or `undefined` while none holds
 * (MB.62): what MB.63's grant and revoke read before acting. Under the
 * `SiteAdmin` proof, since only an admin's act asks, or under a site-tier
 * invitation, which is an admin's act its invitee completes: the accept
 * (MB.70) reads it as the grant does, from a session that holds no proof. The
 * one-open index allows one at most.
 */
export async function findOpenAdminRoleChangePause(
  _asker: SiteAdmin | SiteInvitationRow,
): Promise<typeof adminRoleChangePauses.$inferSelect | undefined> {
  const [row] = await selectFrom(
    adminRoleChangePauses,
    and(notSoftDeleted(adminRoleChangePauses), isNull(adminRoleChangePauses.endedAt)),
  );
  return row;
}

/**
 * The admin role's writer methods, beside the pause's finder rather than in
 * `write.ts`: the pause ledger's two named writes (MB.62), the only writes its
 * `namedWrites` table takes, and the lock a revoke counts under (MB.59).
 * `writerFor` spreads them into the writer (MB.198).
 */
export function adminRoleWrites({
  tx,
  session,
  update,
}: WriterContext): Pick<
  AuditWriter,
  'pauseAdminRoleChanges' | 'resumeAdminRoleChanges' | 'lockLiveAdmins'
> {
  return {
    // Every live admin, locked in id order, so two revokes at once queue on
    // the first row rather than each holding one the other wants.
    lockLiveAdmins: () =>
      selectFrom(users, and(notSoftDeleted(users), eq(users.role, 'admin')), {
        lockIn: tx,
        lockOrder: users.id,
      }),
    // No conflict target: the one-open index is an expression index, and the
    // generated primary key is the only other unique.
    pauseAdminRoleChanges: () =>
      tx
        .insert(adminRoleChangePauses)
        .values(applyAudit('insert', {}, session) as never)
        .onConflictDoNothing()
        .returning(),
    // `now()` beside the trigger's `updated_at`, so the two read alike.
    resumeAdminRoleChanges: () =>
      update(
        adminRoleChangePauses,
        { endedAt: sql`now()`, endedBy: session.userId },
        isNull(adminRoleChangePauses.endedAt),
      ),
  };
}
