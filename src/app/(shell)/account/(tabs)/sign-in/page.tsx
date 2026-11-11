import { single } from '@/lib/search-params';
import { SIGN_IN_NAV } from '../nav';
import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import PageNav from '@/components/PageNav';
import Passkeys from '@/components/Passkeys';
import PasswordSection from '@/components/PasswordSection';
import TwoFactorSettings from '@/components/PasswordSection/two-factor';
import SignInMethods from '@/components/SignInMethods';
import {
  accountPasskeys,
  hasPassword,
  linkedAccounts,
  requireSession,
  sessionIsFresh,
} from '@/lib/request-session';
import { ACCOUNT_PASSWORD_PATH, linkErrorMessage } from '@/lib/sign-in';
import { isRosterProvider } from '@/lib/social-providers';
import { providersToPass } from '@/lib/configured-providers';
import { getMe } from '@/modules/identity';
import type { SignInPageProps } from './types';
import PageWithNav from '@/components/PageWithNav';
import PanelSection from '@/components/PanelSection';
import { PendingLink } from '@/lib/navigation';

export const metadata: Metadata = pageTitle('Sign-In');

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
  const provider = single(params.provider);
  const failedProvider =
    provider !== undefined && isRosterProvider(provider) ? provider : undefined;

  return (
    <PageWithNav as="div" headless>
      <PageNav label="On This Page" entries={SIGN_IN_NAV} />
      <PanelSection
        id="sign-in-methods"
        title="Sign-In Methods"
        lede="You can sign in to this account with any of these."
      >
        <SignInMethods
          passwordHeld={passwordHeld}
          passkeyCount={passkeys.length}
          linked={linked}
          configured={providersToPass()}
          // Better Auth refuses a removal from a session older than a day,
          // so a stale one is offered a fresh sign-in instead of Remove.
          fresh={fresh}
          error={linkError ? { providerId: failedProvider, message: linkError } : undefined}
        />
      </PanelSection>
      <PanelSection
        id="password"
        title="Password"
        lede={
          passwordHeld
            ? 'Changing your password signs out every other device signed in to your account.'
            : linked.length > 0
              ? 'Set a password to sign in with your email address as well as your providers.'
              : 'Set a password to sign in with your email address as well.'
        }
      >
        <PasswordSection hasPassword={passwordHeld} />
      </PanelSection>
      <PanelSection
        id="two-factor"
        title="Two-Factor Sign-In"
        lede="Ask for a code from an authenticator app, as well as your password, when you sign in."
      >
        {/* Two-factor guards password sign-ins alone, so an account with no password has nothing to turn on. */}
        {passwordHeld ? (
          <TwoFactorSettings enabled={me.twoFactorEnabled} />
        ) : (
          <p>
            Two-factor guards password sign-ins, and this account has no password.{' '}
            <PendingLink href={ACCOUNT_PASSWORD_PATH}>Set a Password</PendingLink> first.
          </p>
        )}
      </PanelSection>
      <PanelSection
        id="passkeys"
        title="Passkeys"
        lede={
          <>
            A passkey is tied to this website&rsquo;s address and to the device or password manager
            that holds it.
          </>
        }
      >
        <Passkeys passkeys={passkeys} />
      </PanelSection>
    </PageWithNav>
  );
}
