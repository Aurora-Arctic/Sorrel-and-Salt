import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '../../components/PageHeader';
import SupportLink from '../../components/SupportLink';
import { getShellSession } from '../../lib/request-session';
import LocalTime from '../../components/LocalTime';

export const metadata: Metadata = {
  title: 'Access Paused',
  // A second guard beside robots.txt, which leaves this path out of its allow list: a crawler that
  // fetches the page anyway is told not to list it.
  robots: { index: false },
};

// Where a paused account's pages send it (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access"). It reads the
// viewer's own standing pause, as the shell does, so the address says nothing: signed out it sends the visitor to sign in,
// and with no pause standing, lifted or ended, to the entry page. No AppShell, since the shell would draw the pause notice
// that links here.
export default async function AccessPausedPage() {
  const shell = await getShellSession();
  if (!shell) redirect('/sign-in');
  const { accessPause } = shell;
  if (!accessPause) redirect('/');

  return (
    <main className="page-frame page-frame--narrow">
      <div className="panel">
        <PageHeader headingClassName="auth-title" title="Access Paused" />
        {accessPause.until ? (
          <p>
            Access to this account is paused until <LocalTime at={accessPause.until} long />. The
            rest of the site opens again after that.
          </p>
        ) : (
          <p>
            Access to this account is paused, with no end date. The rest of the site opens again
            once an admin lifts the pause.
          </p>
        )}
        <p>
          You can still reach <SupportLink>Support</SupportLink> signed in, to ask about the pause.
        </p>
        <p>
          The <Link href="/compendium">Compendium</Link> stays open to everyone, without signing in.
        </p>
      </div>
    </main>
  );
}
