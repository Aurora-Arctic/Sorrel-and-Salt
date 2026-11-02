import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { pausedCovenBySlug } from '@/modules/coven';
import PageHeader from '../../../../components/PageHeader';
import { Forbidden } from '../../../../lib/errors';
import { requireSession } from '../../../../lib/request-session';
import { inUtc } from '../../../../lib/utc';
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

  return (
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
            Your access to {paused.name} is paused, with no end date. You can open it again once an
            owner of the coven lifts the pause.
          </p>
        )}
        <p>
          You keep your place in the coven, and your other covens are not affected. The{' '}
          <Link href="/compendium">Compendium</Link> stays open to everyone.
        </p>
      </div>
    </main>
  );
}
