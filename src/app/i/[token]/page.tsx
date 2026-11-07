import type { Metadata } from 'next';
import { cache } from 'react';
import type { ReactElement } from 'react';
import { SupportIcon } from '../../../components/IconTip/icons';
import SupportLink from '../../../components/SupportLink';
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

/** What every card's page says: the site, then what the card gives. */
const Welcome = (): ReactElement => (
  <section className="card-landing__part" aria-labelledby="card-welcome-text">
    <p id="card-welcome-text">{LEDE}</p>
    <p>
      This card admits one person: it gives you an account and the right to start a coven of your
      own. Once you’re in, invite whoever you like.
    </p>
  </section>
);

/** What an early card's page adds: the site is unfinished, and the holder's covens get free months once it charges. */
const Early = (): ReactElement => (
  <section className="card-landing__part" aria-labelledby="card-early">
    <h2 id="card-early">You’re Among the First</h2>
    <p>
      {WORDMARK} is still being built. Explore it, and tell us about anything that goes wrong or
      gets in your way. Open <SupportLink>Support</SupportLink> here, or from{' '}
      <span className="card-landing__support-mark" role="img" aria-label="Support">
        <SupportIcon />
      </span>{' '}
      in the footer of any&nbsp;page.
    </p>
    <p>{WORDMARK} is free for now. Beginning the day it starts charging:</p>
    <ul>
      <li>Your first coven gets three months free.</li>
      <li>Any other coven you created before then gets one month free.</li>
      <li>Any other coven you start after then is charged from the day you start it.</li>
    </ul>
    <p>If your first coven comes later, its three free months start the day you start it.</p>
  </section>
);

// A card's short link, printed small: a welcome while the card is live, a word for an early card's holder, then the same
// panel as `/invite/[token]`, as a card beside the words on a wide window. The welcome is read with no session, as the
// visitor holds only the card. A card that is not live shows the panel alone, which says why.
export default async function CardPage({ params }: InvitePageProps) {
  const { token } = await params;
  const card = await liveCard(token);
  const here = `/i/${encodeURIComponent(token)}`;

  if (!card) {
    return (
      <main className="page-frame page-frame--narrow">
        <InvitationPanel token={token} here={here} />
      </main>
    );
  }

  return (
    <main className="page-frame card-landing welcome-page">
      <div className="card-landing__grid">
        <h1 className="card-landing__title">
          <span className="card-landing__title-greeting">Welcome to</span> <span>{WORDMARK}</span>
        </h1>
        <div className="card-landing__words">
          <Welcome />
          {card.beta && <Early />}
        </div>
        <div className="card-landing__card">
          <InvitationPanel token={token} here={here} headingLevel="h2" />
        </div>
      </div>
    </main>
  );
}
