import type { Metadata } from 'next';
import SignInMethods from '../../../../components/SignInMethods';
import {
  accountPasskeys,
  hasPassword,
  linkedAccounts,
  requireSession,
  sessionIsFresh,
} from '../../../../lib/request-session';
import { linkErrorMessage } from '../../../../lib/sign-in';
import { isRosterProvider } from '../../../../lib/social-providers';
// Server-only — see social-providers-config.ts's own header. Only the
// resulting `configured` ids reach the client component.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../../../lib/social-providers-config';
import type { SignInMethodsPageProps } from './types';

export const metadata: Metadata = {
  title: 'Sign-In Methods — Sorrel & Salt',
};

// A failed provider link returns here with `?error=` and `?provider=`
// (claude-docs/auth/admin-bootstrap.md, "The account page").
export default async function SignInMethodsPage({ searchParams }: SignInMethodsPageProps) {
  const [, params] = await Promise.all([requireSession(), searchParams]);
  const [linked, passwordHeld, fresh, passkeys] = await Promise.all([
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
    <section className="page-frame__section panel" aria-labelledby="account-sign-in-methods-heading">
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
  );
}
