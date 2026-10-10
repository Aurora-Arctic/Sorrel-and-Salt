import type { Metadata } from 'next';
import Link from 'next/link';
import { getMe, isPlaceholderEmail, verificationWaitSeconds } from '@/modules/identity';
import EmailForm from '../../../components/EmailForm';
import { hasVerifiedFlag, verifyErrorMessage } from '../../../lib/account-email';
import { requireSession } from '../../../lib/request-session';
import { postSignInLanding, safeReturnPath } from '../../../lib/sign-in';
import type { EmailPageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Email — Sorrel & Salt',
};

// No AppShell exists yet; `.email-page` centers the form on its own.
export default async function EmailPage({ searchParams }: EmailPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const me = await getMe(session);

  return (
    <main className="email-page">
      <EmailForm
        // A placeholder is the row's way of having no address; the form
        // never shows one (claude-docs/components/email-form.md).
        email={isPlaceholderEmail(me.email) ? '' : me.email}
        verified={me.emailVerified}
        // A followed link lands here with the flag; the row, not the flag,
        // says whether the address is proved, and a refusal never carries it.
        confirmed={
          me.emailVerified && hasVerifiedFlag(params.verified) && params.error === undefined
        }
        next={safeReturnPath(params.next)}
        landing={postSignInLanding(session.role)}
        error={verifyErrorMessage(params.error)}
        waitSeconds={verificationWaitSeconds(me.verificationSentAt)}
      />
      {/* An unverified account reaches no other page, so it is offered none. */}
      {me.emailVerified && (
        <p className="email-page__nav">
          <Link href="/account">Sign-in methods</Link>
        </p>
      )}
    </main>
  );
}
