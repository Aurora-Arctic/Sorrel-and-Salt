import Link from 'next/link';
import type { ReactElement } from 'react';
import { POST_SIGN_IN_LANDING } from '../../lib/sign-in';
import './index.scss';

// The public front door at `/`: what the site is, that it is invite-only, and
// the way in. The session changes exactly one thing — that last link — so a
// signed-in visitor is never asked to sign in again.
// See claude-docs/components/welcome.md.

export interface WelcomeProps {
  /** Whether the visitor holds a live session; the page reads it with `getSession()`. */
  signedIn: boolean;
}

const Welcome = ({ signedIn }: WelcomeProps): ReactElement => (
  <div className="welcome">
    <h1 className="welcome__title">Sorrel &amp; Salt</h1>
    <p className="welcome__lede">
      A shared grimoire of spells for a coven or a household: a compendium of ingredients, the stock
      you keep, and the spells you make from it.
    </p>
    <p className="welcome__gate">
      Sorrel &amp; Salt is invite-only. To get in you need an invitation from someone who already
      uses it — signing in gives you an account, and an invitation gives you somewhere to use it.
    </p>
    <p className="welcome__way-in">
      {signedIn ? (
        // A plain anchor rather than <Link>: typed routes refuse a route that
        // is not built yet, and M2.8 builds this one.
        <a className="btn" href={POST_SIGN_IN_LANDING}>
          Continue
        </a>
      ) : (
        <Link className="btn" href="/sign-in">
          Sign in
        </Link>
      )}
    </p>
  </div>
);

export default Welcome;
