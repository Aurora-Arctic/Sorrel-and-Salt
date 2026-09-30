import type { Metadata } from 'next';
import SignInPanel from '../../components/SignInPanel';
import { safeReturnPath, signInErrorMessage } from '../../lib/sign-in';
// Server-only — see social-providers-config.ts's own header. This page is a
// server component, so the env var names this reads never reach the client
// bundle; only the resulting `configured` ids are passed as a prop.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../lib/social-providers-config';
import type { SignInPageProps } from './types';

export const metadata: Metadata = {
  title: 'Sign in — Sorrel & Salt',
};

// No AppShell: DESIGN.md §9 scopes it to signed-in pages, and this page is
// reachable while signed out.
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const error = signInErrorMessage(params.error);
  const configured = configuredProviders();

  return (
    <main className="sign-in-page">
      <SignInPanel next={next} error={error} configured={configured} />
    </main>
  );
}
