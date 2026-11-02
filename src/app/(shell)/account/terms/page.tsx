import type { Metadata } from 'next';
import TermsAgreement from '../../../../components/TermsAgreement';
import { requireSession } from '../../../../lib/request-session';
import { signedInLanding } from '../../../../lib/landing';
import { safeReturnPath } from '../../../../lib/sign-in';
import { TERMS_UPDATED_ON, TERMS_VERSION } from '../../../../lib/terms-version';
import type { TermsPageProps } from './types';

export const metadata: Metadata = {
  title: 'Terms of Use',
};

// Where an account that has not agreed to the current terms lands from every other protected page. It is exempt from the
// terms check itself (`requireSession`), and an account that has already agreed is let through, so a stale tab does no harm.
export default async function TermsAcceptancePage({ searchParams }: TermsPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const destination = safeReturnPath(params.next) ?? (await signedInLanding(session));

  return (
    <main className="page-frame page-frame--narrow">
      <div className="panel">
        <TermsAgreement
          version={TERMS_VERSION}
          updatedOn={TERMS_UPDATED_ON.toISOString().slice(0, 10)}
          destination={destination}
        />
      </div>
    </main>
  );
}
