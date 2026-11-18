import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { ADDRESS_LEDES } from '@/components/InvitationAcceptance/ledes';
import SignInPanel from '@/components/SignInPanel';
import { modeFromParam } from '@/components/SignInPanel/address';
import type { SignInLedes } from '@/components/SignInPanel/types';
import { emailPagePath } from '@/lib/account-email';
import { signedInLanding } from '@/lib/landing';
import { looksLikeCardToken } from '@/lib/invitation-token';
import { getSession, hasSessionCookie, sessionIsVerified } from '@/lib/request-session';
import { safeReturnPath, signInErrorMessage } from '@/lib/sign-in';
import { invitationTokenFromPath } from '@/lib/invitation-link';
import { publicPageMetadata } from '@/lib/page-metadata';
import { SITE_NAME } from '@/lib/site';
import { providersToPass } from '@/lib/configured-providers';
import type { SignInPageProps } from './types';
import PageFrame from '@/components/PageFrame';

/**
 * Out of search results at every address, links followed: the form is no use as a result, and a crawler that finds it
 * indexable keeps fetching a page that is rendered per request. Canonical stays `/sign-in`, so `?next=` and `?error=` name it.
 */
export const metadata: Metadata = publicPageMetadata(
  'Sign In',
  `Sign in to ${SITE_NAME}.`,
  '/sign-in',
  { noIndex: true },
);

/** Read from the address alone, as the invite page does signed out: reading the invitation would tell a visitor with no account whether its token is live. */
function ledesFor(next: string | undefined): SignInLedes | undefined {
  const token = next === undefined ? undefined : (invitationTokenFromPath(next) ?? undefined);
  return token === undefined || looksLikeCardToken(token) ? undefined : ADDRESS_LEDES;
}

// The (public) layout draws the site bar and holds the `main`, so the frame is a `div`; it is open to a signed-out visitor.
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const session = (await hasSessionCookie()) ? await getSession() : null;
  if (session) {
    const target = (next as Route | undefined) ?? (await signedInLanding(session));
    redirect((await sessionIsVerified()) ? target : (emailPagePath(target) as Route));
  }
  const error = signInErrorMessage(params.error);
  const configured = providersToPass();

  return (
    <PageFrame as="div" narrow className="page-frame--in-column">
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
