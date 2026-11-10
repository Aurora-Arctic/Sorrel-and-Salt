import type { Metadata } from 'next';
import { SUPPORT_LEDE } from './head';
import { noIndexMetadata } from '@/lib/page-metadata';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import SupportPanel from '@/components/SupportPanel';
import type { SupportPanelState } from '@/components/SupportPanel/types';
import { emailPagePath } from '@/lib/account-email';
import { PendingLink } from '@/lib/navigation';
import { getSession, sessionIsVerified } from '@/lib/request-session';
import { single } from '@/lib/search-params';
import {
  SUPPORT_PATH,
  errorCodeOf,
  errorDetailOf,
  errorReferenceOf,
  supportAboutOf,
} from '@/lib/support-path';
import { getMySupportTimeout } from '@/modules/support';
import type { SupportPageProps } from './types';
import PageWithNav from '@/components/PageWithNav';

// Crawlable, so a search engine reads this and drops the bare address it would otherwise list from
// links; the page holds nothing worth a result.
export const metadata: Metadata = noIndexMetadata('Support', true);

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  let state: SupportPanelState;
  if (!session) {
    state = {
      kind: 'signed-out',
      support: supportAboutOf(single(params.support) ?? null),
      errorReference: errorReferenceOf(single(params.ref) ?? null),
      errorDetail: errorDetailOf(single(params.detail) ?? null),
    };
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
          errorDetail: errorDetailOf(single(params.detail) ?? null),
        };
  }
  // The form keeps to the column the account's support tab uses (`.page-with-nav`), not the frame's wide one.
  return (
    <PageWithNav as="div">
      <PageHeader eyebrow="Help" title="Support" lede={SUPPORT_LEDE} />
      <p>
        <PendingLink href="/help">Search Help</PendingLink>
      </p>
      <SupportPanel state={state} path={single(params.from) ?? SUPPORT_PATH} />
    </PageWithNav>
  );
}
