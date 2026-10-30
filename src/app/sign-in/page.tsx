import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import SignInPanel from '../../components/SignInPanel';
import { emailPagePath } from '../../lib/account-email';
import { signedInLanding } from '../../lib/landing';
import { getSession, sessionIsVerified } from '../../lib/request-session';
import { safeReturnPath, signInErrorMessage } from '../../lib/sign-in';
// Server-only, as social-providers-config.ts's own header says. This page is a server component, so
// the env var names this reads never reach the client bundle; only the resulting `configured` ids are
// passed as a prop.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../lib/social-providers-config';
import type { SignInPageProps } from './types';

export const metadata: Metadata = {
  title: 'Sign In',
};

// No AppShell: DESIGN.md §9 scopes it to signed-in pages, and this page is
// reachable while signed out.
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  // A signed-in visitor has nothing to do here: they go where a sign-in would have taken them, and an
  // unverified account to the email page first, as requireSession() sends it.
  const session = await getSession();
  if (session) {
    const target = (next as Route | undefined) ?? (await signedInLanding(session));
    redirect((await sessionIsVerified()) ? target : (emailPagePath(target) as Route));
  }
  const error = signInErrorMessage(params.error);
  const configured = configuredProviders();

  return (
    <main className="page-frame page-frame--narrow">
      <SignInPanel next={next} error={error} configured={configured} />
    </main>
  );
}
