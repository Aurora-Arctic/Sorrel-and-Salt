import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import type { WelcomeProps } from './types';
import './index.scss';
import { PendingLink } from '../../lib/navigation';

// The session changes exactly one thing, the way in (claude-docs/components/welcome.md).

const Welcome = ({ landing }: WelcomeProps): ReactElement => (
  <div className="welcome">
    <PageHeader
      title="Sorrel & Salt"
      lede="A shared grimoire for a coven or a household: a compendium of ingredients, the stock you keep, and the spells you make from it."
    />
    <p className="welcome__gate">
      Sorrel &amp; Salt is invite-only. Signing in gives you an account, but you need an invitation
      from someone who already uses it to get in.
    </p>
    <p className="welcome__way-in">
      {landing ? (
        <PendingLink className="btn btn--solid" href={landing}>
          Continue
        </PendingLink>
      ) : (
        <PendingLink className="btn btn--solid" href="/sign-in">
          Sign In
        </PendingLink>
      )}
      {/* The compendium is public, so it is offered to everyone. */}
      <PendingLink className="btn btn--quiet" href="/compendium">
        Browse the Compendium
      </PendingLink>
    </p>
  </div>
);

export default Welcome;
