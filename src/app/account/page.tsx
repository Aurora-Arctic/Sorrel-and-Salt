import type { Metadata } from 'next';
import { getMe, isPlaceholderEmail, verificationWaitSeconds } from '@/modules/identity';
import EmailForm from '../../components/EmailForm';
import NameForm from '../../components/NameForm';
import SignInMethods from '../../components/SignInMethods';
import SignOutButton from '../../components/SignOutButton';
import { linkedAccounts, requireSession } from '../../lib/request-session';
import { linkErrorMessage, postSignInLanding } from '../../lib/sign-in';
import { isRosterProvider } from '../../lib/social-providers';
// Server-only — see social-providers-config.ts's own header. Only the
// resulting `configured` ids reach the client component.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../lib/social-providers-config';
import type { AccountPageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Account — Sorrel & Salt',
};

// The one account page (MB.88): the name the site shows, the address it
// writes to, and the ways in, each a section under its own heading, ruled
// apart and reached from a nav beneath the page's heading (the owner's
// call). The page owns all three heads, so each section is a region named by
// its heading. The ids are prefixed so no form's own id can meet them. A link
// to add a provider lands back here, with `?error=` and `?provider=` when it
// failed (claude-docs/auth/admin-bootstrap.md, "The account page"). An
// unverified account never reaches it: `requireSession()` sends it to the
// email page.
export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const [me, linked] = await Promise.all([getMe(session), linkedAccounts()]);
  const linkError = linkErrorMessage(params.error);
  // Which row the failure belongs in; anything not on the roster leaves it
  // at the head of the section.
  const failedProvider =
    typeof params.provider === 'string' && isRosterProvider(params.provider)
      ? params.provider
      : undefined;

  return (
    <main className="page-frame page-frame--narrow">
      {/* Sign Out beside the heading, as the admin pages put their primary
          action (on the owner's call). */}
      <div className="page-header">
        <h1>Your Account</h1>
        <SignOutButton />
      </div>
      <nav aria-label="On this page">
        <ul className="link-row">
          <li>
            <a href="#account-name">Name</a>
          </li>
          <li>
            <a href="#account-email">Email</a>
          </li>
          <li>
            <a href="#account-sign-in-methods">Sign-In Methods</a>
          </li>
        </ul>
      </nav>
      <section
        id="account-name"
        className="page-frame__section"
        aria-labelledby="account-name-heading"
      >
        <div className="header">
          <h2 id="account-name-heading">Name</h2>
          <p className="lede">Change your name.</p>
        </div>
        <NameForm name={me.name} />
      </section>
      <hr className="page-frame__rule" />
      <section
        id="account-email"
        className="page-frame__section"
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
          landing={postSignInLanding(session.role)}
          waitSeconds={verificationWaitSeconds(me.verificationSentAt)}
        />
      </section>
      <hr className="page-frame__rule" />
      <section
        id="account-sign-in-methods"
        className="page-frame__section"
        aria-labelledby="account-sign-in-methods-heading"
      >
        <div className="header">
          <h2 id="account-sign-in-methods-heading">Sign-In Methods</h2>
          <p className="lede">Any of these signs you in to this account.</p>
        </div>
        <SignInMethods
          linked={linked}
          configured={configuredProviders()}
          error={linkError ? { providerId: failedProvider, message: linkError } : undefined}
        />
      </section>
    </main>
  );
}
