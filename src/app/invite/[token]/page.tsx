import type { Metadata } from 'next';
import InvitationPanel from './invitation-panel';
import type { InvitePageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Invitation — Sorrel & Salt',
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return (
    <main className="page-frame page-frame--narrow">
      <InvitationPanel token={token} here={`/invite/${encodeURIComponent(token)}`} />
    </main>
  );
}
