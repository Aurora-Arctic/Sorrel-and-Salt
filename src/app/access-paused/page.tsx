import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeader from '../../components/PageHeader';
import { pausedUntil } from '../../lib/access-paused';
import { inUtc } from '../../lib/utc';
import type { AccessPausedPageProps } from './types';

export const metadata: Metadata = {
  title: 'Access Paused',
  // A second guard beside robots.txt, which leaves this path out of its allow list: a crawler that
  // fetches the page anyway is told not to list it.
  robots: { index: false },
};

// Where a paused account's pages send it (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access"). It reads
// nothing but its own `?until=`, which the redirect wrote, so it tells a visitor nothing the address does not. No AppShell:
// it reads no session, so it draws the same signed in or out.
export default async function AccessPausedPage({ searchParams }: AccessPausedPageProps) {
  const until = pausedUntil((await searchParams).until);
  const ended = until !== undefined && until.getTime() <= Date.now();

  return (
    <main className="page-frame page-frame--narrow">
      <div className="panel">
        <PageHeader headingClassName="auth-title" title="Access Paused" />
        {ended ? (
          <p>
            This pause ended at {inUtc(until)}. You can <Link href="/sign-in">Sign In</Link> again.
          </p>
        ) : until ? (
          <p>
            Access to this account is paused until {inUtc(until)}. The rest of the site opens again
            after that.
          </p>
        ) : (
          <p>
            Access to this account is paused, with no end date. The rest of the site opens again
            once an admin lifts the pause.
          </p>
        )}
        <p>
          You can still reach <Link href="/support">Support</Link> signed in, to ask about the
          pause.
        </p>
        <p>
          The <Link href="/compendium">Compendium</Link> stays open to everyone, without signing in.
        </p>
      </div>
    </main>
  );
}
