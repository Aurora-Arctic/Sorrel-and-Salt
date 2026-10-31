'use client';

import { useSearchParams } from 'next/navigation';
import { type ReactElement, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getLastUsedLoginMethod, signIn } from '../../lib/auth-client';
import { GENERIC_SIGN_IN_ERROR, socialSignInTarget } from '../../lib/sign-in';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import { reportLeaving } from '../../lib/navigation';
import Notice from '../Notice';
import PasswordForm from './password-form';
import PageHeader from '../PageHeader';
import ProviderButton from './provider-button';
import type { ProviderId } from '../../lib/types';
import type { SignInPanelProps } from './types';
import './index.scss';

// A cookie announces no change, and only a callback, a full navigation away,
// writes this one: there is nothing to subscribe to.
const noSubscription = () => () => {};

// The cookie read returns `''` for present-but-empty and `null` for none, and React warns when a
// snapshot differs between its two reads. So the snapshot is the roster id the cookie names, or
// `null` for anything else (claude-docs/components/sign-in-panel.md, "Last used").
const getLastUsedProvider = (): ProviderId | null => {
  const value = getLastUsedLoginMethod();
  return SOCIAL_PROVIDERS.find((provider) => provider.id === value)?.id ?? null;
};

// The same cookie, for the password form: Better Auth's lastLoginMethod writes `email` for it.
const getLastUsedPassword = (): boolean => getLastUsedLoginMethod() === 'email';

// The query parameter that opens the email view; each view is its own history entry, so the
// browser's Back button returns from the email form to the provider buttons.
export const EMAIL_VIEW_PARAM = 'method';
export const EMAIL_VIEW = 'email';
const PUSHED_MARK = 'signInEmailViewPushed';

const SignInPanel = ({ next, error, configured }: SignInPanelProps): ReactElement => {
  // The server-rendered callback error, the page's own, until a press starts
  // a new attempt. A failure of that press is said under its own button
  // instead (./provider-button.tsx).
  const [message, setMessage] = useState(error);
  // Better Auth's documented read, taken after hydration: the server has no
  // `document`, so rendering the mark there and here would disagree
  // (claude-docs/components/sign-in-panel.md, "Last used").
  const lastUsed = useSyncExternalStore(noSubscription, getLastUsedProvider, () => null);
  const lastUsedPassword = useSyncExternalStore(noSubscription, getLastUsedPassword, () => false);

  // The provider whose hop is under way. The page is left for the provider's own, so on
  // success it stays set until the browser goes; a return from the back-forward cache (the
  // page restored as it was left) clears it.
  const searchParams = useSearchParams();
  const emailView = searchParams.get(EMAIL_VIEW_PARAM) === EMAIL_VIEW;
  // Held here, not in the form, so the address survives a trip back to the buttons.
  const [email, setEmail] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const shown = useRef(emailView);
  // On a switch of view, focus moves to the new view's heading; the first render leaves focus alone.
  useEffect(() => {
    if (shown.current === emailView) return;
    shown.current = emailView;
    panelRef.current?.querySelector<HTMLElement>('[data-view-heading]')?.focus();
  }, [emailView]);

  const showView = (toEmail: boolean): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (toEmail) params.set(EMAIL_VIEW_PARAM, EMAIL_VIEW);
    else params.delete(EMAIL_VIEW_PARAM);
    const query = params.toString();
    const url = query ? `?${query}` : window.location.pathname;
    if (toEmail) {
      // The mark lets Back undo this push. Next adds its own state keys; copying them in would make its patched pushState skip the sync.
      window.history.pushState({ [PUSHED_MARK]: true }, '', url);
    } else if (window.history.state?.[PUSHED_MARK]) {
      window.history.back();
    } else {
      // Opened straight on the email view: there is no earlier entry of this page to return to.
      window.history.replaceState(null, '', url);
    }
  };

  const [signingIn, setSigningIn] = useState<ProviderId | null>(null);
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setSigningIn(null);
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);

  const signInWith = async (providerId: ProviderId): Promise<string | undefined> => {
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
      setSigningIn(null);
      return GENERIC_SIGN_IN_ERROR;
    }
    // The redirect has started: keep the page bar up until the browser leaves.
    reportLeaving();
    return undefined;
  };

  return (
    // Its own card ground, `.panel`, rather than the page's: /sign-in holds
    // nothing else (claude-docs/components/sign-in-panel.md, "Styling").
    <div className="panel sign-in-panel" ref={panelRef}>
      {message && <Notice kind="error">{message}</Notice>}
      {emailView ? (
        <PasswordForm
          next={next}
          lastUsed={lastUsedPassword}
          email={email}
          onEmailChange={setEmail}
          onBack={() => showView(false)}
          onStart={() => setMessage(undefined)}
        />
      ) : (
        <>
          <PageHeader
            className="sign-in-panel__header"
            title="Sign In"
            lede="Sign in, or create your account, with one of these."
          />
          <div className="sign-in-panel__providers">
            {SOCIAL_PROVIDERS.filter((provider) => !provider.hidden).map((provider) => (
              <ProviderButton
                key={provider.id}
                provider={provider}
                available={configured.includes(provider.id)}
                lastUsed={provider.id === lastUsed}
                signingIn={signingIn}
                onSignIn={signInWith}
              />
            ))}
            <button type="button" className="btn btn--solid" onClick={() => showView(true)}>
              Continue with Email
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SignInPanel;
