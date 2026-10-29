import 'server-only';
import { findCoMemberNamesIncludingSoftDeleted } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import { inIdOrder } from '../../../lib/in-id-order';

// The display names a member reads: a members list, and a row's last
// editor. Gated to co-members, not to site admins, whose ledger reads whole
// rows through `usersForAdmin` under a rule of its own
// (claude-docs/auth/display-names.md, "Display names").

/**
 * The display name of each user named, one answer per id in the order given:
 * a DataLoader's batch. A user who holds or has held a seat in a coven the
 * caller sits in now is answered by name, a removed member's and a deleted
 * user's last included; anyone else is null, as is an id that is not one, so
 * a stranger's name cannot be read by asking for it. A site admin gets no
 * reach past their own covens. One query whatever the batch size.
 */
export async function displayNamesOf(
  session: Session,
  userIds: readonly string[],
): Promise<(string | null)[]> {
  // An id is whatever a row carried, but one that is not a uuid would be a
  // driver error rather than a user nobody shares a coven with.
  const ids = [...new Set(userIds.filter((id) => RowId.safeParse(id).success))];
  const names = await findCoMemberNamesIncludingSoftDeleted(session.userId, ids);
  return inIdOrder(userIds, names, () => null).map((found) => found?.name ?? null);
}
