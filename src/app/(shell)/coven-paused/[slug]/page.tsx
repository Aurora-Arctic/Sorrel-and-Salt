import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { pausedCovenBySlug } from '@/modules/coven';
import LeaveWorkspaceButton from '../../../../components/LeaveWorkspaceButton';
import PageHeader from '../../../../components/PageHeader';
import SupportLink from '../../../../components/SupportLink';
import { Forbidden } from '../../../../lib/errors';
import { requireSession } from '../../../../lib/request-session';
import { viewerOf } from '../../../../lib/viewer';
import LocalTime from '../../../../components/LocalTime';
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
  // The viewer's other covens they can open, so a paused coven is never a dead end. The list is the one way on: the page
  // draws no switcher, which would offer the same covens a second time.
  const { workspaces } = await viewerOf();
  const others = workspaces.filter((workspace) => workspace.slug !== slug && !workspace.paused);

  return (
    <main className="page-frame page-frame--narrow">
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
          You can still ask the coven’s owner, or <SupportLink>Support</SupportLink>, about it.
        </p>
        {others.length > 0 && (
          <section className="page-frame__section">
            <h2 id="other-covens">Your Other Covens</h2>
            <ul aria-labelledby="other-covens">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/coven/${encodeURIComponent(other.slug)}` as Route}>
                    {other.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {/* Leaving is the one thing a paused member may still do in the coven: last and quiet, its confirm the red. An
          owner is never paused, so the plain confirmation serves and no successors are read. */}
        <div className="form__actions">
          <LeaveWorkspaceButton workspaceId={paused.id} name={paused.name} quiet />
        </div>
      </div>
    </main>
  );
}
