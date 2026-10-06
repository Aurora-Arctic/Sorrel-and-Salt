import { and, isNull } from 'drizzle-orm';
import { adminRoleChangePauses } from '../../modules/identity/schema/admin-role-change-pauses';
import type { SiteAdmin } from '@/modules/identity';
import { notSoftDeleted } from './predicates';
import { selectFrom } from './select';

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
