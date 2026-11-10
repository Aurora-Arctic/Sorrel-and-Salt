import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/page-metadata';
import { redirect } from 'next/navigation';
import PageHeader from '../../components/PageHeader';
import SupportLink from '../../components/SupportLink';
import { getShellSession } from '../../lib/request-session';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import LocalTime from '../../components/LocalTime';
import { getMySupportTimeout } from '../../modules/support';
import PageFrame from '@/components/PageFrame';
import { PendingLink } from '@/lib/navigation';

export const metadata: Metadata = noIndexMetadata('Access Paused');

// Where a paused account's pages send it (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access"). It reads the
// viewer's own pause, so the address says nothing. No AppShell, since the shell would draw the notice that links here.
export default async function AccessPausedPage() {
  const shell = await getShellSession();
  if (!shell) redirect('/sign-in');
  const { session, accessPause } = shell;
  if (!accessPause) redirect('/');
  // An unverified account's support reads refuse it, so it is not asked.
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
