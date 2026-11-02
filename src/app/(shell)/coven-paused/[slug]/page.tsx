import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { pausedCovenBySlug } from '@/modules/coven';
import ContextRow from '../../../../components/ContextRow';
import LeaveWorkspaceButton from '../../../../components/LeaveWorkspaceButton';
import PageHeader from '../../../../components/PageHeader';
import WorkspaceSwitcher from '../../../../components/WorkspaceSwitcher';
import { Forbidden } from '../../../../lib/errors';
import { requireSession } from '../../../../lib/request-session';
import { inUtc } from '../../../../lib/utc';
import { viewerOf } from '../../../../lib/viewer';
import type { CovenPausedPageProps } from './types';

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
  // The viewer's other covens, so a paused coven is never a dead end: the switcher lists every one, the paused marked, and
  // the page links to each the viewer can open.
  const { viewer, workspaces } = await viewerOf();
  const others = workspaces.filter((workspace) => workspace.slug !== slug && !workspace.paused);

  return (
    <>
      <ContextRow
        lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={viewer.canCreate} />}
      />
      <main className="page-frame page-frame--narrow">
        <div className="panel">
          <PageHeader title="Access Paused" />
          {paused.until ? (
            <p>
              Your access to {paused.name} is paused until {inUtc(paused.until)}. You can open it
              again after that.
            </p>
          ) : (
            <p>
              Your access to {paused.name} is paused, with no end date. You can open it again once
              an owner of the coven lifts the pause.
            </p>
          )}
          <p>
            You keep your place in the coven, and your other covens are not affected. The{' '}
            <Link href="/compendium">Compendium</Link> stays open to everyone.
          </p>
          {/* Leaving is the one thing a paused member may still do in the coven. An owner is never paused, so the plain
            confirmation serves and no successors are read. */}
          <p>You can still leave the coven.</p>
          <div className="form__actions">
            <LeaveWorkspaceButton workspaceId={paused.id} name={paused.name} />
          </div>
          {others.length > 0 && (
            <>
              <p>Your other covens are open to you:</p>
              <ul aria-label="Your Other Covens">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link href={`/coven/${encodeURIComponent(other.slug)}` as Route}>
                      {other.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
    </>
  );
}
