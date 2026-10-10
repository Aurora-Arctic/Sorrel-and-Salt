import type { Metadata } from 'next';
import { getMe, isPlaceholderEmail, verificationWaitSeconds } from '@/modules/identity';
import EmailForm from '../../components/EmailForm';
import NameForm from '../../components/NameForm';
import SignInMethods from '../../components/SignInMethods';
import { linkedAccounts, requireSession } from '../../lib/request-session';
import { linkErrorMessage, postSignInLanding } from '../../lib/sign-in';
// Server-only — see social-providers-config.ts's own header. Only the
// resulting `configured` ids reach the client component.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../lib/social-providers-config';
import type { AccountPageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Account — Sorrel & Salt',
};

// The one account page (MB.88): the name the site shows, the address it
// writes to, and the ways in, each a section under its own heading. A link
// to add a provider lands back here, with `?error=` when it failed
// (claude-docs/auth/admin-bootstrap.md, "The account page"). An unverified
// account never reaches it: `requireSession()` sends it to the email page.
export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const [me, linked] = await Promise.all([getMe(session), linkedAccounts()]);

  return (
    <main className="account-page">
      <h1 className="account-page__heading">Your Account</h1>
      <section className="account-page__section" aria-labelledby="account-name-heading">
        <h2 id="account-name-heading" className="account-page__section-heading">
          Name
        </h2>
        <NameForm name={me.name} />
      </section>
      <section className="account-page__section" aria-labelledby="account-email-heading">
        <h2 id="account-email-heading" className="account-page__section-heading">
          Email
        </h2>
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
      <section className="account-page__section">
        <SignInMethods
          linked={linked}
          configured={configuredProviders()}
          error={linkErrorMessage(params.error)}
        />
      </section>
    </main>
  );
}
