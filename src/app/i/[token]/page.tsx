import type { Metadata } from 'next';
import InvitationPanel from '../../invite/[token]/invitation-panel';
import type { InvitePageProps } from '../../invite/[token]/types';
import PageFrame from '@/components/PageFrame';

export const metadata: Metadata = {
  title: 'Your Invitation',
};

// A card's short link, printed small: the same panel as `/invite/[token]`.
export default async function CardPage({ params }: InvitePageProps) {
  const { token } = await params;
  return (
    <PageFrame narrow>
      <InvitationPanel token={token} here={`/i/${encodeURIComponent(token)}`} />
    </PageFrame>
  );
}
