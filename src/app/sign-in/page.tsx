import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { ADDRESS_LEDES } from '@/components/InvitationAcceptance/ledes';
import SignInPanel from '@/components/SignInPanel';
import { modeFromParam } from '@/components/SignInPanel/address';
import type { SignInLedes } from '@/components/SignInPanel/types';
import { emailPagePath } from '@/lib/account-email';
import { signedInLanding } from '@/lib/landing';
import { looksLikeCardToken } from '@/lib/invitation-token';
import { getSession, sessionIsVerified } from '@/lib/request-session';
import { safeReturnPath, signInErrorMessage } from '@/lib/sign-in';
import { publicPageMetadata } from '@/lib/page-metadata';
import { SITE_NAME } from '@/lib/site';
// Server component, so the env var names this reads never reach the client bundle; only the `configured` ids pass as a prop.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '@/lib/social-providers-config';
import type { SignInPageProps } from './types';
import PageFrame from '@/components/PageFrame';

/**
 * The bare address is the one to index. `?next=` and `?error=` show the same form, so they name it
 * as canonical and stay out of search results, their links still followed.
 */
export async function generateMetadata({ searchParams }: SignInPageProps): Promise<Metadata> {
  const { next, error } = await searchParams;
  return {
    ...publicPageMetadata('Sign In', `Sign in to ${SITE_NAME}.`, '/sign-in'),
    ...((next !== undefined || error !== undefined) && { robots: { index: false, follow: true } }),
  };
}

const INVITE_LINK = /^\/invite\/([^/?#]+)$/;

/** Read from the address alone, as the invite page does signed out: reading the invitation would tell a visitor with no account whether its token is live. */
function ledesFor(next: string | undefined): SignInLedes | undefined {
  const token = next === undefined ? undefined : INVITE_LINK.exec(next)?.[1];
  return token === undefined || looksLikeCardToken(token) ? undefined : ADDRESS_LEDES;
}

// No AppShell: DESIGN.md §9 scopes it to signed-in pages, and this page is
// reachable while signed out.
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const session = await getSession();
  if (session) {
    const target = (next as Route | undefined) ?? (await signedInLanding(session));
    redirect((await sessionIsVerified()) ? target : (emailPagePath(target) as Route));
  }
  const error = signInErrorMessage(params.error);
  const configured = configuredProviders();

  return (
    <PageFrame narrow>
      <SignInPanel
        next={next}
        error={error}
        configured={configured}
        mode={modeFromParam(params.mode)}
        ledes={ledesFor(next)}
      />
    </PageFrame>
  );
}
