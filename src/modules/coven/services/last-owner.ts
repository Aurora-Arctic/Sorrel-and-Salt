import 'server-only';
import type { AuditWriter } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { WorkspaceRole } from '../types';
import type { Membership } from './membership';

// Called inside the transaction of every write that can take the steward role from someone (demotion, removal, leave),
// so the count it reads is the one the write lands on.

export type LastOwnerRemedy = 'promote' | 'delete';

export class LastOwner extends Forbidden {
  readonly remedy: LastOwnerRemedy;
  readonly promotable: readonly string[];

  constructor(remedy: LastOwnerRemedy, promotable: readonly string[]) {
    super(
      remedy === 'promote'
        ? 'This is the last steward, and a coven needs one. Make another member a steward first.'
        : 'You are the only member. Delete the coven instead of leaving it.',
    );
    this.name = 'LastOwner';
    this.remedy = remedy;
    this.promotable = promotable;
  }
}

/**
 * The members are read under a lock, so a concurrent steward change is counted.
 *
 * @throws {LastOwner} `userId` is the only steward and would stop being one.
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
