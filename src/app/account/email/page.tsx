import type { Metadata } from 'next';
import { getMe, isPlaceholderEmail, verificationWaitSeconds } from '@/modules/identity';
import EmailForm from '../../../components/EmailForm';
import { verifyErrorMessage } from '../../../lib/account-email';
import { requireSession } from '../../../lib/request-session';
import { safeReturnPath } from '../../../lib/sign-in';

export const metadata: Metadata = {
  title: 'Your email — Sorrel & Salt',
};

interface EmailPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
    verified?: string | string[];
  }>;
}

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
        confirmed={me.emailVerified && params.verified === '1' && params.error === undefined}
        next={safeReturnPath(params.next)}
        error={verifyErrorMessage(params.error)}
        waitSeconds={verificationWaitSeconds(me.verificationSentAt)}
      />
    </main>
  );
}
