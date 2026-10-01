import type { Metadata } from 'next';
import Link from 'next/link';
import SignInMethods from '../../components/SignInMethods';
import { linkedAccounts, requireSession } from '../../lib/request-session';
import { linkErrorMessage } from '../../lib/sign-in';
// Server-only — see social-providers-config.ts's own header. Only the
// resulting `configured` ids reach the client component.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../lib/social-providers-config';
import type { AccountPageProps } from './types';

export const metadata: Metadata = {
  title: 'Sign-in methods — Sorrel & Salt',
};

// Where a second provider is added (claude-docs/auth/admin-bootstrap.md, "Linking a second
// provider"). A link lands back here, with `?error=` when it failed.
export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [, params] = await Promise.all([requireSession(), searchParams]);
  const linked = await linkedAccounts();

  return (
    <main className="account-page">
      <SignInMethods
        linked={linked}
        configured={configuredProviders()}
        error={linkErrorMessage(params.error)}
      />
      <p className="account-page__nav">
        <Link href="/account/email">Your email</Link>
      </p>
    </main>
  );
}
