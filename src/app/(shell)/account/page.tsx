import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { readNumberedPage, readPageCursors } from '@/lib/numbered-page';
import {
  countReceivedInvitations,
  getMe,
  isPlaceholderEmail,
  listReceivedInvitations,
  verificationWaitSeconds,
} from '@/modules/identity';
import EmailForm from '../../../components/EmailForm';
import NameForm from '../../../components/NameForm';
import PageNav from '../../../components/PageNav';
import ReceivedInvitations from '../../../components/ReceivedInvitations';
import { requireSession } from '../../../lib/request-session';
import { ACCOUNT_INVITATIONS_ID, ACCOUNT_PATH, ACCOUNT_SIGN_IN_PATH } from '../../../lib/sign-in';
import { signedInLanding } from '../../../lib/landing';
import type { AccountPageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Account — Sorrel & Salt',
};

// The account page: name, address and waiting coven invitations, each its own section under its own heading, with ids
// prefixed so no form's id meets them. The ways in are the tabs at /account/sign-in.
export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const { after, before } = readPageCursors(params);
  const [me, landing, invitations] = await Promise.all([
    getMe(session),
    signedInLanding(session),
    readNumberedPage(
      { after, before },
      (request) => listReceivedInvitations(session, request),
      (start) => countReceivedInvitations(session, start),
    ),
  ]);
  // The pager stays at the section: a page of invitations is what was asked for.
  const invitationsHref = (cursor: Record<string, string>) =>
    `${ACCOUNT_PATH}?${new URLSearchParams(cursor).toString()}#${ACCOUNT_INVITATIONS_ID}` as Route;
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = invitations.pageInfo;

  return (
    <main className="page-frame page-frame--narrow page-with-nav">
      <h1>Your Account</h1>
      <PageNav
        label="On This Page"
        entries={[
          { href: '#account-name', label: 'Name' },
          { href: '#account-email', label: 'Email' },
          { href: `#${ACCOUNT_INVITATIONS_ID}`, label: 'Invitations' },
        ]}
      />
      <p>
        <Link href={ACCOUNT_SIGN_IN_PATH as Route}>Manage Your Sign-In</Link>: sign-in methods,
        password, two-factor and passkeys.
      </p>
      <section
        id="account-name"
        className="page-frame__section panel"
        aria-labelledby="account-name-heading"
      >
        <div className="header">
          <h2 id="account-name-heading">Name</h2>
          <p className="lede">The name Sorrel &amp; Salt shows for you.</p>
        </div>
        <NameForm name={me.name} />
      </section>
      <section
        id="account-email"
        className="page-frame__section panel"
        aria-labelledby="account-email-heading"
      >
        {/* No lede here: the form's own status line says what the section
            is for, and changes with the address's state. */}
        <div className="header">
          <h2 id="account-email-heading">Email</h2>
        </div>
        <EmailForm
          embedded
          // A placeholder is the row's way of having no address; the form
          // never shows one (claude-docs/components/email-form.md).
          email={isPlaceholderEmail(me.email) ? '' : me.email}
          verified={me.emailVerified}
          landing={landing}
          waitSeconds={verificationWaitSeconds(me.verificationSentAt)}
        />
      </section>
      <section
        id={ACCOUNT_INVITATIONS_ID}
        className="page-frame__section panel"
        aria-labelledby="account-invitations-heading"
      >
        <div className="header">
          <h2 id="account-invitations-heading">Invitations</h2>
          <p className="lede">Covens that have invited this email address to join them.</p>
        </div>
        {/* The list is drawn even with no rows, so its own empty line is
            live: the section is always on the page. */}
        <ReceivedInvitations
          invitations={invitations.edges.map(({ node }) => node)}
          position={invitations.position}
          previousHref={
            hasPreviousPage && startCursor ? invitationsHref({ before: startCursor }) : undefined
          }
          nextHref={hasNextPage && endCursor ? invitationsHref({ after: endCursor }) : undefined}
        />
      </section>
    </main>
  );
}
