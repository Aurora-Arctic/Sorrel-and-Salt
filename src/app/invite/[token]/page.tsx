import type { Metadata } from 'next';
import InvitationPanel from './invitation-panel';
import type { InvitePageProps } from './types';
import PageFrame from '@/components/PageFrame';

export const metadata: Metadata = {
  title: 'Your Invitation',
};

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { token } = await params;
  // Only whether a code came back: the code itself is never shown.
  const { error } = await searchParams;
  return (
    <PageFrame narrow>
      <InvitationPanel
        token={token}
        here={`/invite/${encodeURIComponent(token)}`}
        linkFailed={error !== undefined}
      />
    </PageFrame>
  );
}
