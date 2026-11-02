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

// Where a paused account's sign-in lands (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access"). It reads
// nothing but its own `?until=`, which the refused sign-in wrote, so it tells a visitor nothing the address does not.
// No AppShell: the page is reached signed out.
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
            Access to this account is paused until {inUtc(until)}. You can sign in again after that.
          </p>
        ) : (
          <p>
            Access to this account is paused, with no end date. You can sign in again once an admin
            lifts the pause.
          </p>
        )}
        <p>
          The <Link href="/compendium">Compendium</Link> stays open to everyone, without signing in.
        </p>
      </div>
    </main>
  );
}
