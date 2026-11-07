import type { Metadata } from 'next';
import { cache } from 'react';
import type { ReactElement } from 'react';
import { SupportIcon } from '../../../components/IconTip/icons';
import SupportLink from '../../../components/SupportLink';
import PageHeader from '../../../components/PageHeader';
import { BACK_LEDE, WORDMARK } from '../../../lib/invitation-cards/copy';
import InvitationPanel from '../../invite/[token]/invitation-panel';
import type { InvitePageProps } from '../../invite/[token]/types';
import PageFrame from '@/components/PageFrame';
import { liveCardOf } from '@/modules/identity';

export const metadata: Metadata = {
  title: 'Your Invitation',
};

// Cached so a second render in the request reads once (CLAUDE.md rule 1).
const liveCard = cache(liveCardOf);

const LEDE = `${WORDMARK} is ${BACK_LEDE.charAt(0).toLowerCase()}${BACK_LEDE.slice(1)}`;

const Welcome = ({ beta }: { beta: boolean }): ReactElement => (
  <section className="card-landing__part" aria-labelledby="card-welcome-text">
    <p id="card-welcome-text">{LEDE}</p>
    <p>
      This card admits one person: it gives you an account and the right to start a coven of your
      own. Once you’re in, invite whoever you like.
    </p>
    {!beta && (
      <p>
        {WORDMARK} is free for now. Once it starts charging, your first coven gets one month free.
      </p>
    )}
  </section>
);

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

export default async function CardPage({ params }: InvitePageProps) {
  const { token } = await params;
  const card = await liveCard(token);
  const here = `/i/${encodeURIComponent(token)}`;

  if (!card) {
    return (
      <PageFrame narrow>
        <InvitationPanel token={token} here={here} />
      </PageFrame>
    );
  }

  return (
    <PageFrame className={`card-landing welcome-page${card.beta ? '' : ' card-landing--single'}`}>
      <div className="card-landing__grid">
        <PageHeader
          title={WORDMARK}
          greeting="Welcome to"
          className="card-landing__head"
          headingClassName="card-landing__title"
        />
        <div className="card-landing__words">
          <Welcome beta={card.beta} />
          {card.beta && <Early />}
        </div>
        <div className="card-landing__card">
          <InvitationPanel token={token} here={here} headingLevel="h2" />
        </div>
      </div>
    </PageFrame>
  );
}
