'use client';

import { type ReactElement, useState } from 'react';
import { signIn } from '../../lib/auth-client';
import { GENERIC_SIGN_IN_ERROR } from '../../lib/sign-in';
import { SOCIAL_PROVIDERS, type ProviderId } from '../../lib/social-providers';
import { DiscordIcon, FacebookIcon, GoogleIcon, MicrosoftIcon } from './icons';
import './index.scss';

// The familiar per-provider "Continue with X" mark, matched to each
// provider's own brand button convention rather than the app's own icon set
// — claude-docs/components/sign-in-panel.md, "Provider branding".
const PROVIDER_ICONS: Record<ProviderId, () => ReactElement> = {
  google: GoogleIcon,
  discord: DiscordIcon,
  facebook: FacebookIcon,
  microsoft: MicrosoftIcon,
};

export interface SignInPanelProps {
  /** Where a successful sign-in returns to; already run through safeReturnPath. */
  next: string;
  /** A readable sentence for a failed callback, from signInErrorMessage — never a raw code. */
  error?: string;
  /** Providers this environment has credentials for; the rest render greyed out. */
  configured: readonly ProviderId[];
}

const SignInPanel = ({ next, error, configured }: SignInPanelProps): ReactElement => {
  // Seeded from the server-rendered callback error, then replaced by a
  // pre-redirect failure (signIn.social's own `{ error }` result) — the two
  // never show at once, so one field covers both.
  const [message, setMessage] = useState(error);

  const handleClick = async (providerId: ProviderId): Promise<void> => {
    if (!configured.includes(providerId)) return;
    setMessage(undefined);
    // errorCallbackURL carries `next` along: a failed attempt would otherwise
    // lose the destination and land back at plain /sign-in.
    const result = await signIn.social({
      provider: providerId,
      callbackURL: next,
      errorCallbackURL: `/sign-in?next=${encodeURIComponent(next)}`,
    });
    if (result?.error) {
      setMessage(GENERIC_SIGN_IN_ERROR);
    }
  };

  return (
    <div className="sign-in-panel">
      <h1 className="sign-in-panel__heading">Sign In</h1>
      {message && (
        <p className="sign-in-panel__error" role="alert">
          {message}
        </p>
      )}
      <div className="sign-in-panel__providers">
        {SOCIAL_PROVIDERS.map((provider) => {
          const isAvailable = configured.includes(provider.id);
          const noteId = `sign-in-panel__note-${provider.id}`;
          const Icon = PROVIDER_ICONS[provider.id];
          return (
            <div key={provider.id} className="sign-in-panel__provider">
              <button
                type="button"
                // The brand colour class is dropped entirely once
                // unavailable, rather than layered under a disabled
                // modifier: `.btn[aria-disabled='true']`
                // (_primitives.scss) is what styles this state, and a
                // brand-colour class sitting alongside it would tie in
                // specificity — the winner then depending on which
                // stylesheet loads second, exactly what "unavailable"
                // must never be.
                className={
                  isAvailable
                    ? `btn sign-in-panel__button sign-in-panel__button--${provider.id}`
                    : 'btn sign-in-panel__button'
                }
                // Not `disabled`: that removes the button from the tab order,
                // and every provider must stay keyboard-reachable.
                aria-disabled={isAvailable ? undefined : true}
                aria-describedby={isAvailable ? undefined : noteId}
                onClick={() => handleClick(provider.id)}
              >
                <Icon />
                Continue with {provider.label}
              </button>
              {!isAvailable && (
                <p id={noteId} className="sign-in-panel__note">
                  Not available right now.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SignInPanel;
