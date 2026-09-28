import type { Metadata } from 'next';
import Link from 'next/link';
import SignInMethods from '../../components/SignInMethods';
import { linkedAccounts, requireSession } from '../../lib/request-session';
import { linkErrorMessage } from '../../lib/sign-in';
// Server-only — see social-providers-config.ts's own header. Only the
// resulting `configured` ids reach the client component.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../lib/social-providers-config';

export const metadata: Metadata = {
  title: 'Sign-in methods — Sorrel & Salt',
};

interface AccountPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<{ error?: string | string[] }>;
}

// Where a second provider is added (claude-docs/auth.md, "Linking a second
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
