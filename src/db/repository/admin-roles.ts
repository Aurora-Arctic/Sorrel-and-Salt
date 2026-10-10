import { and, isNull, sql } from 'drizzle-orm';
import { applyAudit } from '../audit';
import { adminRoleChangePauses } from '../../modules/identity/schema/admin-role-change-pauses';
import type { SiteAdmin } from '@/modules/identity';
import { notSoftDeleted } from './predicates';
import { selectFrom } from './select';
import type { AuditWriter, WriterContext } from './types';

/**
 * The open pause on admin role changes, or `undefined` while none holds
 * (MB.62): what MB.63's grant and revoke read before acting. Under the
 * `SiteAdmin` proof, since only an admin's act asks. The one-open index
 * allows one at most.
 */
export async function findOpenAdminRoleChangePause(
  _admin: SiteAdmin,
): Promise<typeof adminRoleChangePauses.$inferSelect | undefined> {
  const [row] = await selectFrom(
    adminRoleChangePauses,
    and(notSoftDeleted(adminRoleChangePauses), isNull(adminRoleChangePauses.endedAt)),
  );
  return row;
}

/**
 * The pause ledger's two named writes (MB.62), beside its finder rather than
 * in `write.ts`: the table is marked `namedWrites`, so these are the only
 * writes it takes, and `writerFor` spreads them into the writer (MB.198).
 */
export function adminRoleChangePauseWrites({
  tx,
  session,
  update,
}: WriterContext): Pick<AuditWriter, 'pauseAdminRoleChanges' | 'resumeAdminRoleChanges'> {
  return {
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
