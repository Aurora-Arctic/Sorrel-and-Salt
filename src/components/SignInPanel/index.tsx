'use client';

import { type ReactElement, useEffect, useState, useSyncExternalStore } from 'react';
import { getLastUsedLoginMethod, signIn } from '../../lib/auth-client';
import { GENERIC_SIGN_IN_ERROR, socialSignInTarget } from '../../lib/sign-in';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import { reportLeaving } from '../../lib/navigation';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import { ProviderUnavailableNote } from '../ProviderMark/unavailable-note';
import { PROVIDER_MARKS } from './icons';
import type { ProviderId } from '../../lib/types';
import type { SignInPanelProps } from './types';
import './index.scss';

// A cookie announces no change, and only a callback, a full navigation away,
// writes this one: there is nothing to subscribe to.
const noSubscription = () => () => {};

// The raw read is not passed to `useSyncExternalStore` as it is: it returns
// `''` for a cookie that is present but empty (or mid-expiry) and `null` for
// none, and React, which reads a snapshot twice per render and warns when the
// two differ, would see two answers to one question. The snapshot is the roster
// id the cookie names, or `null`: anything else is the same "none", and
// strings compare by value, so a provider id is stable too
// (claude-docs/components/sign-in-panel.md, "Last used").
const getLastUsedProvider = (): ProviderId | null => {
  const value = getLastUsedLoginMethod();
  return SOCIAL_PROVIDERS.find((provider) => provider.id === value)?.id ?? null;
};

const SignInPanel = ({ next, error, configured }: SignInPanelProps): ReactElement => {
  // Seeded from the server-rendered callback error, then replaced by a
  // pre-redirect failure (signIn.social's own `{ error }` result) — the two
  // never show at once, so one field covers both.
  const [message, setMessage] = useState(error);
  // Better Auth's documented read, taken after hydration: the server has no
  // `document`, so rendering the mark there and here would disagree
  // (claude-docs/components/sign-in-panel.md, "Last used").
  const lastUsed = useSyncExternalStore(noSubscription, getLastUsedProvider, () => null);

  // The provider whose hop is under way. The page is left for the provider's
  // own, so on success it stays set until the browser goes; a return from the
  // back-forward cache (the page restored as it was left) clears it.
  const [signingIn, setSigningIn] = useState<ProviderId | null>(null);
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setSigningIn(null);
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);

  const handleClick = async (providerId: ProviderId): Promise<void> => {
    if (!configured.includes(providerId) || signingIn) return;
    setMessage(undefined);
    setSigningIn(providerId);
    // errorCallbackURL carries `next` along: a failed attempt would otherwise
    // lose the destination and land back at plain /sign-in. With no `next`,
    // the callback lands the account by its role.
    // A dropped connection throws rather than answering `error`; both say so.
    const result = await (async () => {
      try {
        return await signIn.social({ provider: providerId, ...socialSignInTarget(next) });
      } catch (thrown) {
        return { error: thrown };
      }
    })();
    if (result?.error) {
      setMessage(GENERIC_SIGN_IN_ERROR);
      setSigningIn(null);
      return;
    }
    // The redirect has started: keep the page bar up until the browser leaves.
    reportLeaving();
  };

  return (
    // Its own card ground, `.panel`, rather than the page's: /sign-in holds
    // nothing else (claude-docs/components/sign-in-panel.md, "Styling").
    <div className="panel sign-in-panel">
      <div className="header sign-in-panel__header">
        <h1>Sign In</h1>
        <p className="lede">Sign in, or create your account, with one of these.</p>
      </div>
      {message && <Notice kind="error">{message}</Notice>}
      <div className="sign-in-panel__providers">
        {SOCIAL_PROVIDERS.map((provider) => {
          const isAvailable = configured.includes(provider.id);
          const noteId = `sign-in-panel__note-${provider.id}`;
          // The familiar per-provider "Continue with X" mark, matched to each
          // provider's own brand button rather than the app's own icon set —
          // claude-docs/components/sign-in-panel.md, "Provider branding".
          // Facebook's white "f" sits on its blue chip on a button.
          const Mark = PROVIDER_MARKS[provider.id];
          const isLastUsed = provider.id === lastUsed;
          return (
            <div key={provider.id} className="sign-in-panel__provider">
              <BusyButton
                busy={signingIn === provider.id}
                busyLabel="Signing In"
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
                // Read as one phrase with a pause, where the text alone would
                // run the label into the badge: "Discord Last Used".
                aria-label={
                  isLastUsed && signingIn !== provider.id
                    ? `Continue with ${provider.label}, last used`
                    : undefined
                }
                // The others wait for the pressed one; `disabled`, since a page
                // being left has no use for their tab stops.
                disabled={signingIn !== null && signingIn !== provider.id}
                onClick={() => handleClick(provider.id)}
              >
                <Mark chip />
                Continue with {provider.label}
                {isLastUsed && (
                  <span className="badge badge--last-used sign-in-panel__last-used">Last Used</span>
                )}
              </BusyButton>
              {!isAvailable && <ProviderUnavailableNote id={noteId} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SignInPanel;
