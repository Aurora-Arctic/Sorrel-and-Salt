import type { Metadata } from 'next';
import { getMe } from '@/modules/identity';
import CreateWorkspaceForm from '../../../components/CreateWorkspaceForm';
import Notice from '../../../components/Notice';
import { requireSession } from '../../../lib/request-session';

export const metadata: Metadata = {
  title: 'Create Workspace — Sorrel & Salt',
};

// The create-workspace page (M9.16): reached from `/coven` by a rights holder
// with no coven yet (M2.8) and from the switcher's Create Workspace (M6.9).
// A static segment beside `[slug]`, which Next routes first, so the coven
// layout and its guard do not run here; `new` is kept from ever being a slug
// (`isReservedCovenSlug`). The right is read from the row, not the session,
// since accepting an invitation sets it mid-session. Showing the form only to
// a holder is presentation: `createWorkspace` is still the gate
// (claude-docs/auth/coven-guard.md, "The create page").
export default async function NewCovenPage() {
  const session = await requireSession();
  const me = await getMe(session);

  return (
    // Centred in the narrow page frame, on a panel, as the email page's form
    // is (the owner's call, 2026-10-12).
    <main className="page-frame page-frame--narrow">
      <div className="page-frame__section panel">
        <div className="header">
          <h1>Create Workspace</h1>
          <p className="lede">Start a coven of your own. You will be its owner.</p>
        </div>
        {me.canCreateWorkspace ? (
          <CreateWorkspaceForm />
        ) : (
          <Notice kind="warn" quiet>
            Creating a coven needs an invitation from someone already using Sorrel &amp; Salt, or an
            admin&rsquo;s approval.
          </Notice>
        )}
      </div>
    </main>
  );
}
