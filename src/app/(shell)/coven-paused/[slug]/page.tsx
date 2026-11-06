import type { Metadata, Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { pausedCovenBySlug } from '@/modules/coven';
import ContextRow from '../../../../components/ContextRow';
import LeaveWorkspaceButton from '../../../../components/LeaveWorkspaceButton';
import PageHeader from '../../../../components/PageHeader';
import SupportLink from '../../../../components/SupportLink';
import { Forbidden } from '../../../../lib/errors';
import { requireSession } from '../../../../lib/request-session';
import { viewerOf } from '../../../../lib/viewer';
import WorkspaceSwitcher from '../../../../components/WorkspaceSwitcher';
import LocalTime from '../../../../components/LocalTime';
import type { CovenPausedPageProps } from './types';
import PageFrame from '@/components/PageFrame';
import { PendingLink } from '@/lib/navigation';

export const metadata: Metadata = {
  title: 'Access Paused',
  robots: { index: false },
};

// Where a member whose access to one coven is paused lands from that coven's pages (claude-docs/auth/coven-guard.md, "A paused
// member"). Outside `/coven/[slug]`, whose layout refuses them. It reads the pause through the service by the slug, so it
// shows a stranger the same 404 the coven's pages do, and sends a member with no pause standing back in.
export default async function CovenPausedPage({ params }: CovenPausedPageProps) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  let paused;
  try {
    paused = await pausedCovenBySlug(session, slug);
  } catch (error) {
    if (error instanceof Forbidden) notFound();
    throw error;
  }
  if (!paused) redirect(`/coven/${encodeURIComponent(slug)}` as Route);
  // The switcher and the list of the viewer's other covens they can open, so a paused coven is never a dead end.
  const { viewer, workspaces } = await viewerOf();
  const others = workspaces.filter((workspace) => workspace.slug !== slug && !workspace.paused);

  return (
    <>
      <ContextRow
        lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={viewer.canCreate} />}
      />
      <PageFrame narrow>
        <div className="page-frame__section panel">
          <PageHeader
            title="Access Paused"
            lede={
              paused.until ? (
                <>
                  Your access to <strong>{paused.name}</strong> is paused until{' '}
                  <LocalTime at={paused.until} long />.
                </>
              ) : (
                <>
                  Your access to <strong>{paused.name}</strong> is paused, with no end date.
                </>
              )
            }
          />
          <p>
            You can still ask the coven’s steward, or <SupportLink>Support</SupportLink>, about it.
          </p>
          {/* Leaving is the one thing a paused member may still do in the coven: quiet, its confirm the red. A
            steward is never paused, so the plain confirmation serves and no successors are read. */}
          <div className="form__actions">
            <LeaveWorkspaceButton workspaceId={paused.id} name={paused.name} quiet />
          </div>
          {others.length > 0 && (
            <section className="page-frame__section">
              <h2 id="other-covens">Your Other Covens</h2>
              <ul aria-labelledby="other-covens">
                {others.map((other) => (
                  <li key={other.slug}>
                    <PendingLink href={`/coven/${encodeURIComponent(other.slug)}` as Route}>
                      {other.name}
                    </PendingLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </PageFrame>
    </>
  );
}
