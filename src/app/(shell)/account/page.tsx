import type { Metadata, Route } from 'next';
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
import Passkeys from '../../../components/Passkeys';
import PasswordSection from '../../../components/PasswordSection';
import ReceivedInvitations from '../../../components/ReceivedInvitations';
import SignInMethods from '../../../components/SignInMethods';
import {
  accountPasskeys,
  hasPassword,
  linkedAccounts,
  requireSession,
  sessionIsFresh,
} from '../../../lib/request-session';
import { ACCOUNT_INVITATIONS_ID, ACCOUNT_PATH, linkErrorMessage } from '../../../lib/sign-in';
import { signedInLanding } from '../../../lib/landing';
import { isRosterProvider } from '../../../lib/social-providers';
// Server-only — see social-providers-config.ts's own header. Only the
// resulting `configured` ids reach the client component.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../../lib/social-providers-config';
import type { AccountPageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Account — Sorrel & Salt',
};

// The one account page: name, address, ways in, password and waiting coven invitations, each its own section
// under its own heading, with ids prefixed so no form's id meets them. A failed provider link returns
// with `?error=` and `?provider=` (claude-docs/auth/admin-bootstrap.md, "The account page").
export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const { after, before } = readPageCursors(params);
  const [me, linked, passwordHeld, fresh, landing, invitations] = await Promise.all([
    getMe(session),
    linkedAccounts(),
    hasPassword(),
    sessionIsFresh(),
    signedInLanding(session),
    readNumberedPage(
      { after, before },
      (request) => listReceivedInvitations(session, request),
      (start) => countReceivedInvitations(session, start),
    ),
  ]);
  const passkeys = await accountPasskeys();
  // The pager stays at the section: a page of invitations is what was asked for.
  const invitationsHref = (cursor: Record<string, string>) =>
    `${ACCOUNT_PATH}?${new URLSearchParams(cursor).toString()}#${ACCOUNT_INVITATIONS_ID}` as Route;
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = invitations.pageInfo;
  const linkError = linkErrorMessage(params.error);
  // Which row the failure belongs in; anything not on the roster leaves it
  // at the head of the section.
  const failedProvider =
    typeof params.provider === 'string' && isRosterProvider(params.provider)
      ? params.provider
      : undefined;

  return (
    <main className="page-frame page-frame--narrow page-with-nav">
      <h1>Your Account</h1>
      <PageNav
        label="On This Page"
        entries={[
          { href: '#account-name', label: 'Name' },
          { href: '#account-email', label: 'Email' },
          { href: '#account-sign-in-methods', label: 'Sign-In Methods' },
          { href: '#account-password', label: 'Password' },
          { href: '#account-passkeys', label: 'Passkeys' },
          { href: `#${ACCOUNT_INVITATIONS_ID}`, label: 'Invitations' },
        ]}
      />
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
        id="account-sign-in-methods"
        className="page-frame__section panel"
        aria-labelledby="account-sign-in-methods-heading"
      >
        <div className="header">
          <h2 id="account-sign-in-methods-heading">Sign-In Methods</h2>
          <p className="lede">You can sign in to this account with any of these.</p>
        </div>
        <SignInMethods
          linked={linked}
          configured={configuredProviders()}
          // Better Auth refuses a removal from a session older than a day,
          // so a stale one is offered a fresh sign-in instead of Remove.
          fresh={fresh}
          error={linkError ? { providerId: failedProvider, message: linkError } : undefined}
        />
      </section>
      <section
        id="account-password"
        className="page-frame__section panel"
        aria-labelledby="account-password-heading"
      >
        <div className="header">
          <h2 id="account-password-heading">Password</h2>
          <p className="lede">
            {passwordHeld
              ? 'Changing your password signs out every other device signed in to your account.'
              : linked.length > 0
                ? 'Set a password to sign in with your email address as well as your providers.'
                : 'Set a password to sign in with your email address as well.'}
          </p>
        </div>
        <PasswordSection hasPassword={passwordHeld} twoFactorEnabled={me.twoFactorEnabled} />
      </section>
      <section
        id="account-passkeys"
        className="page-frame__section panel"
        aria-labelledby="account-passkeys-heading"
      >
        <div className="header">
          <h2 id="account-passkeys-heading">Passkeys</h2>
          <p className="lede">
            A passkey works only on the site where it was added: one added here will not sign you in
            on another Sorrel &amp; Salt site, such as staging.
          </p>
        </div>
        <Passkeys passkeys={passkeys} />
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
