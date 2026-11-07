import type { Metadata } from 'next';
import { getMe } from '@/modules/identity';
import CreateWorkspaceForm from '../../../../components/CreateWorkspaceForm';
import ContextRow from '../../../../components/ContextRow';
import Notice from '../../../../components/Notice';
import PageHeader from '../../../../components/PageHeader';
import WorkspaceSwitcher from '../../../../components/WorkspaceSwitcher';
import { requireSession } from '../../../../lib/request-session';
import { viewerOf } from '../../../../lib/viewer';
import PageFrame from '@/components/PageFrame';

export const metadata: Metadata = {
  title: 'Create Coven',
};

// The create-workspace page. It belongs to no one coven, so the coven guard does not run;
// `isReservedCovenSlug` keeps `new` from being a slug. The right is read from the row, not the session,
// and showing the form only to a holder is presentation, as `createWorkspace` is the gate.
export default async function NewCovenPage({
  searchParams,
}: {
  searchParams?: Promise<{ card?: string }>;
}) {
  const session = await requireSession();
  const me = await getMe(session);
  const { viewer, workspaces } = await viewerOf();
  const fromCard = (await searchParams)?.card === 'accepted';

  return (
    <>
      {workspaces.length > 0 && (
        <ContextRow
          lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={viewer.canCreate} />}
        />
      )}
      {/* Centred in the narrow page frame, on a panel, as the email page's form
          is. */}
      <PageFrame narrow>
        <div className="page-frame__section panel">
          <PageHeader
            className="card-page-header"
            headingClassName="auth-title"
            title="Create Coven"
            lede="Start a coven of your own. You will be its steward."
          />
          {fromCard && me.canCreateWorkspace && (
            <Notice kind="success" quiet>
              Your card is accepted: you can now start a coven.
            </Notice>
          )}
          {me.canCreateWorkspace ? (
            <CreateWorkspaceForm />
          ) : (
            <Notice kind="warn" quiet>
              Creating a coven needs an invitation from someone already using Sorrel &amp; Salt, or
              a keeper&rsquo;s approval.
            </Notice>
          )}
        </div>
      </PageFrame>
    </>
  );
}
