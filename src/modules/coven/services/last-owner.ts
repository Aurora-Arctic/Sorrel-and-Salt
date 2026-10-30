import 'server-only';
import type { AuditWriter } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { WorkspaceRole } from '../types';
import type { Membership } from './membership';

// A workspace never loses its last owner. Called by every write that can
// take the owner role from someone — a demotion, a removal and a
// voluntary leave — inside the transaction that writes, so the count
// it reads is the one the write lands on.

/** What the interface can offer instead: promote one of `promotable`, or delete the workspace. */
export type LastOwnerRemedy = 'promote' | 'delete';

/**
 * Refusal of a change that would leave a workspace with no owner. A `Forbidden` carrying the way out:
 * `promote` (`promotable` lists the user ids) when other members exist, `delete` when the owner is alone.
 */
export class LastOwner extends Forbidden {
  readonly remedy: LastOwnerRemedy;
  readonly promotable: readonly string[];

  constructor(remedy: LastOwnerRemedy, promotable: readonly string[]) {
    super(
      remedy === 'promote'
        ? 'This is the last owner, and a coven needs one. Make another member an owner first.'
        : 'You are the only member. Delete the coven instead of leaving it.',
    );
    this.name = 'LastOwner';
    this.remedy = remedy;
    this.promotable = promotable;
  }
}

/**
 * Refuses a change to `userId` that would leave the workspace without an
 * owner. `becomes` is the role they end up with, or `null` when they leave or
 * are removed. A change that keeps an owner an owner, or touches a non-owner,
 * passes.
 *
 * The members are read under a lock and the count taken from that read, so an
 * owner's change that committed while this one waited is already counted.
 *
 * @throws {LastOwner} `userId` is the only owner and would stop being one.
 */
export async function assertNotLastOwner(
  write: AuditWriter,
  membership: Membership,
  userId: string,
  becomes: WorkspaceRole | null,
): Promise<void> {
  if (becomes === 'owner') return;
  const members = await write.lockLiveMembers(membership);
  const owners = members.filter((member) => member.role === 'owner');
  if (owners.length !== 1 || owners[0].userId !== userId) return;
  const others = members
    .filter((member) => member.userId !== userId)
    .map((member) => member.userId);
  throw new LastOwner(others.length > 0 ? 'promote' : 'delete', others);
}
