import type { Metadata } from 'next';
import InvitationPanel from './invitation-panel';
import type { InvitePageProps } from './types';
import PageFrame from '@/components/PageFrame';
import { SITE_INVITATION_PARAM } from '@/lib/invitation-link';

export const metadata: Metadata = {
  title: 'Your Invitation',
};

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { token } = await params;
  const query = await searchParams;
  return (
    <PageFrame narrow>
      <InvitationPanel
        token={token}
        // Bare: `verifiedLanding` and the sign-in page's ledes match the link exactly, and the marker matters only signed out.
        here={`/invite/${encodeURIComponent(token)}`}
        // Only whether a code came back: the code itself is never shown.
        linkFailed={query.error !== undefined}
        marker={query[SITE_INVITATION_PARAM]}
      />
    </PageFrame>
  );
}
