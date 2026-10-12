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

// The create-workspace page (M9.16): reached from `/coven` by a rights holder
// with no coven yet (M2.8) and from the switcher's Create Coven (M6.9).
// Inside the shell. It belongs to no one coven, so its context row holds the
// switcher alone, with no section nav, and only for someone who already has a
// coven to switch to; a first-time creator has nothing to switch between.
// A static segment beside `[slug]`, which Next routes first, so the coven
// layout and its guard do not run here; `new` is kept from ever being a slug
// (`isReservedCovenSlug`). The right is read from the row, not the session,
// since accepting an invitation sets it mid-session. Showing the form only to
// a holder is presentation: `createWorkspace` is still the gate
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
          is (the owner's call, 2026-10-12). */}
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
