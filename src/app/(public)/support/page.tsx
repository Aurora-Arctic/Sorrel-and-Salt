import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '../../../components/PageHeader';
import SupportPanel from '../../../components/SupportPanel';
import type { SupportPanelState } from '../../../components/SupportPanel/types';
import { emailPagePath } from '../../../lib/account-email';
import { getSession, sessionIsVerified } from '../../../lib/request-session';
import { single } from '../../../lib/search-params';
import {
  SUPPORT_PATH,
  errorCodeOf,
  errorReferenceOf,
  supportAboutOf,
} from '../../../lib/support-path';
import { getMySupportTimeout } from '../../../modules/support';
import type { SupportPageProps } from './types';

// Crawlable, so a search engine reads this and drops the bare address it would otherwise list from
// links; the page holds nothing worth a result.
export const metadata: Metadata = {
  title: 'Support',
  robots: { index: false, follow: true },
};

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  let state: SupportPanelState;
  if (!session) {
    state = { kind: 'signed-out', support: supportAboutOf(single(params.support) ?? null) };
  } else {
    if (!(await sessionIsVerified())) redirect(emailPagePath(undefined));
    const timedOut = await getMySupportTimeout(session);
    const asked = single(params.support);
    state = timedOut
      ? { kind: 'timed-out', until: timedOut.until }
      : {
          kind: 'form',
          support: supportAboutOf(asked ?? null),
          errorCode: errorCodeOf(single(params.error) ?? null),
          errorReference: errorReferenceOf(single(params.ref) ?? null),
        };
  }
  // The form keeps to the column the account's support tab uses (`.page-with-nav`), not the frame's wide one.
  return (
    <div className="page-with-nav">
      <PageHeader
        eyebrow="Help"
        title="Support"
        lede="Tell us about something you cannot use, something broken, or ask a question."
      />
      <p>
        <Link href="/help">Search Help</Link> first: the answer may already be there.
      </p>
      <SupportPanel state={state} path={single(params.from) ?? SUPPORT_PATH} />
    </div>
  );
}
