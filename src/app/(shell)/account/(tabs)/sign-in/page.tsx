import type { Metadata } from 'next';
import Link from 'next/link';
import PageNav from '../../../../../components/PageNav';
import Passkeys from '../../../../../components/Passkeys';
import PasswordSection from '../../../../../components/PasswordSection';
import TwoFactorSettings from '../../../../../components/PasswordSection/two-factor';
import SignInMethods from '../../../../../components/SignInMethods';
import {
  accountPasskeys,
  hasPassword,
  linkedAccounts,
  requireSession,
  sessionIsFresh,
} from '../../../../../lib/request-session';
import { ACCOUNT_PASSWORD_PATH, linkErrorMessage } from '../../../../../lib/sign-in';
import { isRosterProvider } from '../../../../../lib/social-providers';
// Server-only — see social-providers-config.ts's own header. Only the
// resulting `configured` ids reach the client component.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../../../../lib/social-providers-config';
import { getMe } from '@/modules/identity';
import type { SignInPageProps } from './types';

export const metadata: Metadata = {
  title: 'Sign-In — Sorrel & Salt',
};

// The account's ways in, one section each: sign-in methods, password, two-factor and passkeys. A failed provider link returns
// here with `?error=` and `?provider=` (claude-docs/auth/admin-bootstrap.md, "The account page").
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const [me, linked, passwordHeld, fresh, passkeys] = await Promise.all([
    getMe(session),
    linkedAccounts(),
    hasPassword(),
    sessionIsFresh(),
    accountPasskeys(),
  ]);
  const linkError = linkErrorMessage(params.error);
  // Which row the failure belongs in; anything not on the roster leaves it
  // at the head of the section.
  const failedProvider =
    typeof params.provider === 'string' && isRosterProvider(params.provider)
      ? params.provider
      : undefined;

  return (
    <div className="page-with-nav page-with-nav--headless">
      <PageNav
        label="On This Page"
        entries={[
          { href: '#sign-in-methods', label: 'Sign-In Methods' },
          { href: '#password', label: 'Password' },
          { href: '#two-factor', label: 'Two-Factor Sign-In' },
          { href: '#passkeys', label: 'Passkeys' },
        ]}
      />
      <section
        id="sign-in-methods"
        className="page-frame__section panel"
        aria-labelledby="account-sign-in-methods-heading"
      >
        <div className="header">
          <h2 id="account-sign-in-methods-heading">Sign-In Methods</h2>
          <p className="lede">You can sign in to this account with any of these.</p>
        </div>
        <SignInMethods
          passwordHeld={passwordHeld}
          passkeyCount={passkeys.length}
          linked={linked}
          configured={configuredProviders()}
          // Better Auth refuses a removal from a session older than a day,
          // so a stale one is offered a fresh sign-in instead of Remove.
          fresh={fresh}
          error={linkError ? { providerId: failedProvider, message: linkError } : undefined}
        />
      </section>
      <section
        id="password"
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
        <PasswordSection hasPassword={passwordHeld} />
      </section>
      <section
        id="two-factor"
        className="page-frame__section panel"
        aria-labelledby="account-two-factor-heading"
      >
        <div className="header">
          <h2 id="account-two-factor-heading">Two-Factor Sign-In</h2>
          <p className="lede">
            Ask for a code from an authenticator app, as well as your password, when you sign in.
          </p>
        </div>
        {/* Two-factor guards password sign-ins alone, so an account with no password has nothing to turn on. */}
        {passwordHeld ? (
          <TwoFactorSettings enabled={me.twoFactorEnabled} />
        ) : (
          <p>
            Two-factor guards password sign-ins, and this account has no password.{' '}
            <Link href={ACCOUNT_PASSWORD_PATH}>Set a Password</Link> first.
          </p>
        )}
      </section>
      <section
        id="passkeys"
        className="page-frame__section panel"
        aria-labelledby="account-passkeys-heading"
      >
        <div className="header">
          <h2 id="account-passkeys-heading">Passkeys</h2>
          <p className="lede">
            A passkey is tied to this website&rsquo;s address and to the device or password manager
            that holds it.
          </p>
        </div>
        <Passkeys passkeys={passkeys} />
      </section>
    </div>
  );
}
