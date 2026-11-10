import type { Metadata } from 'next';
import { TERMS_TITLE } from '@/components/TermsAgreement/head';
import { noIndexMetadata } from '@/lib/page-metadata';
import TermsAgreement from '@/components/TermsAgreement';
import { documentsChangedSince } from '@/lib/agreement-version';
import { requireSession, sessionAgreedVersion } from '@/lib/request-session';
import { signedInLanding } from '@/lib/landing';
import { safeReturnPath } from '@/lib/sign-in';
import { agreementVersionInForce, readDocument } from '@/modules/documents';
import type { TermsPageProps } from './types';
import PageFrame from '@/components/PageFrame';

// Out of search results and unfollowed: the public Terms of Use link here, and a signed-out crawler
// is sent on to sign-in.
export const metadata: Metadata = noIndexMetadata(TERMS_TITLE, false);

// Where an account that has not agreed to the current terms lands from every other protected page. It is exempt from the
// terms check itself (`requireSession`), and an account that has already agreed is let through, so a stale tab does no harm.
const NEVER_AGREED = { terms: null, disclaimer: null, ethics: null };

export default async function TermsAcceptancePage({ searchParams }: TermsPageProps) {
  const [session, params, terms, version, agreed] = await Promise.all([
    requireSession(),
    searchParams,
    readDocument('terms'),
    agreementVersionInForce(),
    sessionAgreedVersion(),
  ]);
  const destination = safeReturnPath(params.next) ?? (await signedInLanding(session));

  return (
    <PageFrame narrow>
      <div className="panel">
        <TermsAgreement
          version={version}
          changed={documentsChangedSince(agreed ?? NEVER_AGREED, version)}
          updatedOn={terms.publishedAt.toISOString().slice(0, 10)}
          destination={destination}
        />
      </div>
    </PageFrame>
  );
}
