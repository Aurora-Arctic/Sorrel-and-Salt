import Link from 'next/link';
import type { ReactElement } from 'react';
import type { WelcomeProps } from './types';
import './index.scss';

// The public front door at `/`: what the site is, that it is invite-only, the
// way in, and the way to the public compendium. The session changes exactly one
// thing, the way in, so a signed-in visitor is never asked to sign in again.
// See claude-docs/components/welcome.md.

const Welcome = ({ landing }: WelcomeProps): ReactElement => (
  <div className="welcome">
    <div className="header">
      <h1 className="welcome__title">Sorrel &amp; Salt</h1>
      <p className="welcome__lede lede">
        A shared grimoire for a coven or a household: a compendium of ingredients, the stock you
        keep, and the spells you make from it.
      </p>
    </div>
    <p className="welcome__gate">
      Sorrel &amp; Salt is invite-only. Signing in gives you an account, but you need an invitation
      from someone who already uses it to get in.
    </p>
    <p className="welcome__way-in">
      {landing ? (
        <Link className="btn btn--solid" href={landing}>
          Continue
        </Link>
      ) : (
        <Link className="btn btn--solid" href="/sign-in">
          Sign In
        </Link>
      )}
      {/* The compendium is public, so it is offered to everyone. */}
      <Link className="btn btn--quiet" href="/compendium">
        Browse the Compendium
      </Link>
    </p>
  </div>
);

export default Welcome;
