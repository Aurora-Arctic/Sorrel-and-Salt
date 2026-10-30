import { PendingLink } from '../../../../lib/navigation';
import { covenTarget } from '../../../../lib/coven-path';
import type { Route } from 'next';
import { displayNamesOf } from '@/modules/identity';
import { memberRoster, rolePermits } from '@/modules/coven';
import DeleteWorkspaceButton from '../../../../components/DeleteWorkspaceButton';
import LeaveWorkspaceButton from '../../../../components/LeaveWorkspaceButton';
import type { Successor } from '../../../../components/LeaveWorkspaceButton/types';
import { WORKSPACE_ROLE_ACCESS } from '../../../../components/MemberList/role-access';
import PageNav from '../../../../components/PageNav';
import type { PageNavEntry } from '../../../../components/PageNav/types';
import { requireCovenMembership, requireSession } from '../../../../lib/request-session';
import type { CovenLayoutParams } from './types';

// The page a coven opens on. The layout's title template does not apply in its own segment, so this
// titles itself with the coven's name. The guard runs again (claude-docs/auth/coven-guard.md,
// "The coven guard"). Leave and Delete sit in separate sections, never side by side.
const ROLE_NAME = { owner: 'an owner', member: 'a member', viewer: 'a viewer' } as const;

export default async function CovenPage({ params }: CovenLayoutParams) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  const canDelete = rolePermits(membership.role, { workspace: ['delete'] });
  const canReadMembers = rolePermits(membership.role, { member: ['read'] });
  const canInvite = rolePermits(membership.role, { member: ['invite'] });

  // The last-owner guard stops only an owner, and only when they are the sole one, so only then is
  // the roll read: the others become the hand-over's choices. Anyone else leaves by the plain
  // confirmation, and a change in the owners since this render is still the service's to refuse.
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

  // Only the pages the caller can open are listed, so none is a link to a 404. Every role can open
  // Ingredients; Members is listed only for a role that may read it. The section and its menu entry
  // are built together, so they agree.
  const entries: PageNavEntry[] = [
    { href: '#coven-contents' as const, label: 'Contents' },
    { href: '#coven-membership', label: 'Your Membership' },
    ...(canDelete ? [{ href: '#coven-delete' as const, label: 'Delete This Coven' }] : []),
  ];

  return (
    <main className="page-with-nav">
      <div className="header">
        <p className="eyebrow">Coven</p>
        <h1>
          {workspace.name}
          {workspace.demo && (
            <>
              {' '}
              <span className="badge badge--demo">Demo</span>
            </>
          )}
        </h1>
        <p className="lede">
          You are {ROLE_NAME[membership.role]} of this coven.{' '}
          {WORKSPACE_ROLE_ACCESS[membership.role]}
        </p>
      </div>
      <PageNav label="On This Page" entries={entries} />
      <section
        id="coven-contents"
        className="page-frame__section"
        aria-labelledby="coven-contents-heading"
      >
        <h2 id="coven-contents-heading">Contents</h2>
        <ul className="admin-contents__list">
          <li>
            <PendingLink
              href={`/coven/${slug}/ingredients` as Route}
              navigationTarget={covenTarget(`/coven/${slug}/ingredients`)}
              aria-describedby="coven-contents-ingredients"
            >
              Ingredients
            </PendingLink>
            <span id="coven-contents-ingredients" className="admin-contents__description">
              What the coven has in its cupboard, and what it can add from the compendium.
            </span>
          </li>
          {canReadMembers && (
            <li>
              <PendingLink
                href={`/coven/${slug}/members` as Route}
                navigationTarget={covenTarget(`/coven/${slug}/members`)}
                aria-describedby="coven-contents-members"
              >
                Members
              </PendingLink>
              <span id="coven-contents-members" className="admin-contents__description">
                {canInvite
                  ? 'Who is in the coven, what each may do, and the invitations still waiting.'
                  : 'Who is in the coven and what each may do.'}
              </span>
            </li>
          )}
        </ul>
      </section>
      {/* Each button says its own refusal under itself. Leave is here, not
          on the members page, because a viewer cannot open that page and must
          still be able to go. Delete asks for the permission its service
          checks, never a rank
          (claude-docs/auth/coven-guard.md, "The coven index page"). */}
      <section
        id="coven-membership"
        className="page-frame__section"
        aria-labelledby="coven-membership-heading"
      >
        <h2 id="coven-membership-heading">Your Membership</h2>
        <div className="form__actions">
          <LeaveWorkspaceButton
            workspaceId={workspace.id}
            name={workspace.name}
            successors={successors}
          />
        </div>
      </section>
      {canDelete && (
        <section
          id="coven-delete"
          className="page-frame__section"
          aria-labelledby="coven-delete-heading"
        >
          <h2 id="coven-delete-heading">Delete This Coven</h2>
          <p>Closes its ingredients and its grimoire to every member, other owners included.</p>
          <div className="form__actions">
            <DeleteWorkspaceButton workspaceId={workspace.id} name={workspace.name} />
          </div>
        </section>
      )}
    </main>
  );
}
