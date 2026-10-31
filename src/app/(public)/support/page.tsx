import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PageHeader from '../../../components/PageHeader';
import SupportPanel from '../../../components/SupportPanel';
import type { SupportPanelState } from '../../../components/SupportPanel/types';
import { emailPagePath } from '../../../lib/account-email';
import { getSession, sessionIsVerified } from '../../../lib/request-session';
import { single } from '../../../lib/search-params';
import { SUPPORT_PATH, errorCodeOf, supportKindOf } from '../../../lib/support-path';
import { getMySupportTimeoutEnd } from '../../../modules/support';
import type { SupportPageProps } from './types';

export const metadata: Metadata = {
  title: 'Support',
};

// Open to a signed-out visitor, who is offered Sign In in place of the form. An unverified account is
// sent to confirm its address; a timed-out sender is told when that ends.
export default async function SupportPage({ searchParams }: SupportPageProps) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  let state: SupportPanelState;
  if (!session) {
    state = { kind: 'signed-out' };
  } else {
    if (!(await sessionIsVerified())) redirect(emailPagePath(undefined));
    const until = await getMySupportTimeoutEnd(session);
    const asked = single(params.support);
    state = until
      ? { kind: 'timed-out', until }
      : {
          kind: 'form',
          support: asked === undefined ? undefined : supportKindOf(asked),
          errorCode: errorCodeOf(single(params.error) ?? null),
        };
  }
  return (
    <>
      <PageHeader
        eyebrow="Help"
        title="Support"
        lede="Tell us about something you cannot use, something broken, or ask a question."
      />
      <SupportPanel state={state} path={single(params.from) ?? SUPPORT_PATH} />
    </>
  );
}
