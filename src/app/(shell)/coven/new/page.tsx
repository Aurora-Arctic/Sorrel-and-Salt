import type { Metadata } from 'next';
import { CREATE_COVEN_LEDE, CREATE_COVEN_TITLE } from './head';
import { pageTitle } from '@/lib/page-metadata';
import { getMe } from '@/modules/identity';
import CreateWorkspaceForm from '../../../../components/CreateWorkspaceForm';
import ContextRow from '../../../../components/ContextRow';
import Notice from '../../../../components/Notice';
import WorkspaceSwitcher from '../../../../components/WorkspaceSwitcher';
import { requireSession } from '../../../../lib/request-session';
import { viewerOf } from '../../../../lib/viewer';
import NarrowPanelPage from '@/components/NarrowPanelPage';

export const metadata: Metadata = pageTitle(CREATE_COVEN_TITLE);

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
    <NarrowPanelPage
      contextRow={
        workspaces.length > 0 && (
          <ContextRow
            lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={viewer.canCreate} />}
          />
        )
      }
      title={CREATE_COVEN_TITLE}
      lede={CREATE_COVEN_LEDE}
    >
      {fromCard && me.canCreateWorkspace && (
        <Notice kind="success" quiet>
          Your card is accepted: you can now start a coven.
        </Notice>
      )}
      {me.canCreateWorkspace ? (
        <CreateWorkspaceForm />
      ) : (
        <Notice kind="warn" quiet>
          Creating a coven needs an invitation from someone already using Sorrel &amp; Salt, or a
          keeper&rsquo;s approval.
        </Notice>
      )}
    </NarrowPanelPage>
  );
}
