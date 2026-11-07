import type { Metadata } from 'next';
import { getMe, isPlaceholderEmail, verificationWaitSeconds } from '@/modules/identity';
import EmailForm from '../../../../components/EmailForm';
import { hasVerifiedFlag, verifyErrorMessage } from '../../../../lib/account-email';
import { requireSession } from '../../../../lib/request-session';
import { signedInLanding } from '../../../../lib/landing';
import { ACCOUNT_PATH, safeReturnPath } from '../../../../lib/sign-in';
import type { EmailPageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Email',
};

export default async function EmailPage({ searchParams }: EmailPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const [me, landing] = await Promise.all([getMe(session), signedInLanding(session)]);

  return (
    <main className="page-frame page-frame--narrow">
      <div className="panel">
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
          landing={landing}
          error={verifyErrorMessage(params.error)}
          waitSeconds={verificationWaitSeconds(me.verificationSentAt)}
          accountPath={ACCOUNT_PATH}
        />
      </div>
    </main>
  );
}
