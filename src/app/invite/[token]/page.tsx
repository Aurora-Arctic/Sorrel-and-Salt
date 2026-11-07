import type { Metadata } from 'next';
import InvitationPanel from './invitation-panel';
import type { InvitePageProps } from './types';
import PageFrame from '@/components/PageFrame';

export const metadata: Metadata = {
  title: 'Your Invitation',
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return (
    <PageFrame narrow>
      <InvitationPanel token={token} here={`/invite/${encodeURIComponent(token)}`} />
    </PageFrame>
  );
}
