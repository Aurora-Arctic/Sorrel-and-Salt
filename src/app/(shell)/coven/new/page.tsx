import type { Metadata } from 'next';
import { getMe } from '@/modules/identity';
import CreateWorkspaceForm from '../../../../components/CreateWorkspaceForm';
import ContextRow from '../../../../components/ContextRow';
import Notice from '../../../../components/Notice';
import WorkspaceSwitcher from '../../../../components/WorkspaceSwitcher';
import { requireSession } from '../../../../lib/request-session';
import { viewerOf } from '../../../../lib/viewer';

export const metadata: Metadata = {
  title: 'Create Coven — Sorrel & Salt',
};

// The create-workspace page, reached from `/coven` by a rights holder with no coven yet and from the
// switcher's Create Coven. It belongs to no one coven, so its context row holds the switcher alone,
// and only for someone who already has a coven to switch to. A static segment beside `[slug]`, which
// Next routes first, so the coven guard does not run here; `isReservedCovenSlug` keeps `new` from
// being a slug. The right is read from the row, not the session, since accepting an invitation sets it
// mid-session; showing the form only to a holder is presentation, as `createWorkspace` is the gate
// (claude-docs/auth/coven-guard.md, "The create page").
export default async function NewCovenPage() {
  const session = await requireSession();
  const me = await getMe(session);
  const { viewer, workspaces } = await viewerOf();

  return (
    <>
      {workspaces.length > 0 && (
        <ContextRow
          lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={viewer.canCreate} />}
        />
      )}
      {/* Centred in the narrow page frame, on a panel, as the email page's form
          is. */}
      <main className="page-frame page-frame--narrow">
        <div className="page-frame__section panel">
          <div className="header">
            <h1>Create Coven</h1>
            <p className="lede">Start a coven of your own. You will be its owner.</p>
          </div>
          {me.canCreateWorkspace ? (
            <CreateWorkspaceForm />
          ) : (
            <Notice kind="warn" quiet>
              Creating a coven needs an invitation from someone already using Sorrel &amp; Salt, or
              an admin&rsquo;s approval.
            </Notice>
          )}
        </div>
      </main>
    </>
  );
}
