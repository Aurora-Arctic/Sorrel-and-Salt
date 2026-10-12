import { rolePermits } from '@/modules/coven';
import { requireCovenMembership } from '../../../../lib/request-session';
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

  return (
    <main>
      <h1>{workspace.name}</h1>
      {/* Leave is here, not on the members page, because a viewer cannot
          open that page and must still be able to go. Delete asks for the
          permission M6.14's service checks, never a rank. Both stay disabled
          until M6.15 and M6.14 wire them (claude-docs/auth/coven-guard.md,
          "The coven index page"). */}
      <section className="page-frame__section" aria-labelledby="coven-membership">
        <h2 id="coven-membership">Your Membership</h2>
        <div className="form__actions">
          <button type="button" className="btn" disabled>
            Leave Workspace
          </button>
          {rolePermits(membership.role, { workspace: ['delete'] }) && (
            <button type="button" className="btn btn--destructive" disabled>
              Delete Workspace
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
