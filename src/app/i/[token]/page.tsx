import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { BACK_LEDE, WORDMARK } from '../../../lib/invitation-cards/copy';
import InvitationPanel from '../../invite/[token]/invitation-panel';
import type { InvitePageProps } from '../../invite/[token]/types';
import { liveCardOf } from '@/modules/identity';

export const metadata: Metadata = {
  title: 'Your Invitation',
};

// Cached so a second render in the request reads once (CLAUDE.md rule 1).
const liveCard = cache(liveCardOf);

// The card's back says what the site is; the page says it as a sentence with the site's name.
const LEDE = `${WORDMARK} is ${BACK_LEDE.charAt(0).toLowerCase()}${BACK_LEDE.slice(1)}`;

// A card's short link, printed small: a welcome while the card is live, a beta tester's word when its batch is beta,
// then the same panel as `/invite/[token]`. The welcome is read with no session, as the visitor holds only the card.
export default async function CardPage({ params }: InvitePageProps) {
  const { token } = await params;
  const card = await liveCard(token);
  return (
    <main className="page-frame page-frame--narrow">
      {card && (
        <section className="panel card-welcome" aria-labelledby="card-welcome">
          <div className="card-welcome__part">
            <h2 id="card-welcome">Welcome to {WORDMARK}</h2>
            <p>{LEDE}</p>
            <p>
              This card gives you an account and the right to start a coven of your own. Once
              you&apos;re in, invite whoever you like.
            </p>
          </div>
          {card.beta && (
            <div className="card-welcome__part">
              <h2>You&apos;re a Beta Tester</h2>
              <p>
                {WORDMARK} is still being built. Explore it, and tell us about anything that goes
                wrong or gets in your way, through the <Link href="/support">Support page</Link>.
              </p>
              <p>
                When {WORDMARK} starts charging, the first coven you start gets three months free.
                Everyone else gets one.
              </p>
            </div>
          )}
        </section>
      )}
      <InvitationPanel token={token} here={`/i/${encodeURIComponent(token)}`} />
    </main>
  );
}
