import { displayNamesOf } from '@/modules/identity';
import { memberRoster, rolePermits } from '@/modules/coven';
import DeleteWorkspaceButton from '../../../../components/DeleteWorkspaceButton';
import ActionFailure from '../../../../components/WorkspaceActions/action-failure';
import LeaveWorkspaceButton from '../../../../components/LeaveWorkspaceButton';
import type { Successor } from '../../../../components/LeaveWorkspaceButton/types';
import { requireCovenMembership, requireSession } from '../../../../lib/request-session';
import type { CovenLayoutParams } from './types';

// The page a coven opens on (M9.15), where the switcher, an accepted
// invitation and the shell's coven link all land. The layout's template
// titles it with the coven's name alone, since Next does not apply a
// layout's template to a page in its own segment. The guard runs again here
// for the layout's reason: a layout does not re-run on client-side
// navigation (claude-docs/auth/coven-guard.md, "The coven guard").
export default async function CovenPage({ params }: CovenLayoutParams) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  const canDelete = rolePermits(membership.role, { workspace: ['delete'] });

  // The last-owner guard stops only an owner, and only when they are the sole
  // one, so only then is the roll read: the others become the hand-over's
  // choices (M6.16). Anyone else leaves by the plain confirmation, and a
  // change in the owners since this render is still the service's to refuse.
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
    <main>
      <h1>{workspace.name}</h1>
      {/* Leave is here, not on the members page, because a viewer cannot
          open that page and must still be able to go. Delete asks for the
          permission M6.14's service checks, never a rank
          (claude-docs/auth/coven-guard.md, "The coven index page"). */}
      <section className="page-frame__section" aria-labelledby="coven-membership">
        <h2 id="coven-membership">Your Membership</h2>
        <ActionFailure>
          <div className="form__actions">
            <LeaveWorkspaceButton
              workspaceId={workspace.id}
              name={workspace.name}
              successors={successors}
            />
            {canDelete && (
              <DeleteWorkspaceButton workspaceId={workspace.id} name={workspace.name} />
            )}
          </div>
        </ActionFailure>
      </section>
    </main>
  );
}
