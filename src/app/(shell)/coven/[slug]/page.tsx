import { displayNamesOf } from '@/modules/identity';
import { memberRoster, rolePermits } from '@/modules/coven';
import DeleteWorkspaceButton from '../../../../components/DeleteWorkspaceButton';
import RenameWorkspaceForm from '../../../../components/RenameWorkspaceForm';
import LeaveWorkspaceButton from '../../../../components/LeaveWorkspaceButton';
import type { Successor } from '../../../../components/LeaveWorkspaceButton/types';
import { requireCovenMembership, requireSession } from '../../../../lib/request-session';
import type { CovenLayoutParams } from './types';
import CovenHome from '../../../../components/CovenHome';

// The page a coven opens on. The layout's title template does not apply in its own segment, so this
// titles itself with the coven's name. The guard runs again (claude-docs/auth/coven-guard.md,
// "The coven guard"). Leave and Delete sit in separate sections, never side by side.

export default async function CovenPage({ params }: CovenLayoutParams) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  const canDelete = rolePermits(membership.role, { workspace: ['delete'] });
  const canReadMembers = rolePermits(membership.role, { member: ['read'] });
  const canRename = rolePermits(membership.role, { workspace: ['update'] });
  const canInvite = rolePermits(membership.role, { member: ['invite'] });

  // The last-steward guard stops only a steward, and only when they are the sole one, so only then is
  // the roll read: the others become the hand-over's choices. Anyone else leaves by the plain
  // confirmation, and a change in the stewards since this render is still the service's to refuse.
  let successors: Successor[] | undefined;
  if (canDelete) {
    const session = await requireSession();
    const roster = await memberRoster(session, workspace);
    if (roster.filter(({ role }) => role === 'owner').length === 1) {
      const others = roster.filter(({ userId }) => userId !== session.userId);
      const names = await displayNamesOf(
        session,
        others.map(({ userId }) => userId),
      );
      successors = others.map(({ userId, role }, index) => ({
        userId,
        role,
        name: names[index] ?? 'Unknown',
      }));
    }
  }

  return (
    <CovenHome
      slug={slug}
      role={membership.role}
      access={{ canDelete, canReadMembers, canInvite, canRename }}
      name={workspace.name}
      demo={workspace.demo}
      leave={
        <LeaveWorkspaceButton
          workspaceId={workspace.id}
          name={workspace.name}
          successors={successors}
        />
      }
      rename={<RenameWorkspaceForm workspaceId={workspace.id} name={workspace.name} />}
      remove={<DeleteWorkspaceButton workspaceId={workspace.id} name={workspace.name} />}
    />
  );
}
