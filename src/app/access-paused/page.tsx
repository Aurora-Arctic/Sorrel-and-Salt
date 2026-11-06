import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PageHeader from '../../components/PageHeader';
import SupportLink from '../../components/SupportLink';
import { getShellSession } from '../../lib/request-session';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import LocalTime from '../../components/LocalTime';
import { getMySupportTimeout } from '../../modules/support';
import PageFrame from '@/components/PageFrame';
import { PendingLink } from '@/lib/navigation';

export const metadata: Metadata = {
  title: 'Access Paused',
  // A second guard beside robots.txt, which leaves this path out of its allow list: a crawler that
  // fetches the page anyway is told not to list it.
  robots: { index: false },
};

// Where a paused account's pages send it (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access"). It reads the
// viewer's own standing pause, as the shell does, so the address says nothing: signed out it sends the visitor to sign in,
// and with no pause standing, lifted or ended, to the entry page. No AppShell, since the shell would draw the pause notice
// that links here, so the page links to the viewer's own requests itself: without the account menu there is no other way.
export default async function AccessPausedPage() {
  const shell = await getShellSession();
  if (!shell) redirect('/sign-in');
  const { session, accessPause } = shell;
  if (!accessPause) redirect('/');
  // An unverified account's support reads refuse it, and its pages send it to confirm the address first.
  const timedOut = session.emailUnverified ? null : await getMySupportTimeout(session);

  return (
    <PageFrame narrow>
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
            once a keeper lifts the pause.
          </p>
        )}
        {/* Timed out, the page leaves out the Support dialog link, since the dialog could send nothing. */}
        {timedOut ? (
          <>
            {timedOut.until ? (
              <p>
                You cannot send a support request until <LocalTime at={timedOut.until} long />.
              </p>
            ) : (
              <p>You cannot send a support request: you are timed out with no end date.</p>
            )}
            <p>
              You can still <PendingLink href={SUPPORT_LIST_PATH}>read your requests</PendingLink>.
            </p>
          </>
        ) : (
          <p>
            You can still reach <SupportLink>Support</SupportLink> signed in, to ask about the
            pause, and read <PendingLink href={SUPPORT_LIST_PATH}>your requests</PendingLink>.
          </p>
        )}
        <p>
          The <PendingLink href="/compendium">Compendium</PendingLink> stays open to everyone,
          without signing in.
        </p>
      </div>
    </PageFrame>
  );
}
