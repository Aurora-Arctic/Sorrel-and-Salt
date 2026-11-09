'use client';

import { useSearchParams } from 'next/navigation';
import { type ReactElement, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getLastUsedLoginMethod, signIn } from '../../lib/auth-client';
import { GENERIC_SIGN_IN_ERROR, socialSignInTarget } from '../../lib/sign-in';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import { reportLeaving } from '../../lib/navigation';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import ModeSwitch from './mode-switch';
import PasswordForm from './password-form';
import ProviderButton from './provider-button';
import PasskeyButton from './passkey-button';
import type { ProviderId } from '../../lib/types';
import { SIGN_IN_TITLES } from './titles';
import type { SignInAttempt, SignInMode, SignInPanelProps } from './types';
import './index.scss';

export { EMAIL_VIEW_TITLES, SIGN_IN_TITLES } from './titles';

// A cookie announces no change, and only a callback, a full navigation away, writes this one:
// there is nothing to subscribe to.
const noSubscription = () => () => {};

// The cookie read returns `''` for present-but-empty and `null` for none, and React warns when a
// snapshot differs between its two reads. So the snapshot is the roster id the cookie names, or
// `null` for anything else (claude-docs/components/sign-in-panel.md, "Contracts").
const getLastUsedProvider = (): ProviderId | null => {
  const value = getLastUsedLoginMethod();
  return SOCIAL_PROVIDERS.find((provider) => provider.id === value)?.id ?? null;
};

const getLastUsedPassword = (): boolean => getLastUsedLoginMethod() === 'email';
// Whether the cookie names a passkey sign-in, which is not a roster provider.
const getLastUsedPasskey = (): boolean => getLastUsedLoginMethod() === 'passkey';

// The query parameter that opens the email view; each view is its own history entry, so the
// browser's Back button returns from the email form to the provider buttons.
export const EMAIL_VIEW_PARAM = 'method';
export const EMAIL_VIEW = 'email';
const PUSHED_MARK = 'signInEmailViewPushed';

const SignInPanel = ({
  next,
  error,
  configured,
  mode: initialMode = 'sign-in',
  onModeChange,
  inDialog = false,
  signUpLandsOnNext,
  onSignedUp,
  onEmailViewChange,
  ledes,
}: SignInPanelProps): ReactElement => {
  // Held here, not in the form, so a switch made in either view holds in the other.
  const [mode, setMode] = useState<SignInMode>(initialMode);
  const switchMode = (to: SignInMode): void => {
    setMode(to);
    onModeChange?.(to);
  };
  const signingUp = mode === 'sign-up';
  // The server-rendered callback error, the page's own, until a press starts
  // a new attempt. A failure of that press is said under its own button
  // instead (./provider-button.tsx).
  const [message, setMessage] = useState(error);
  // The code step has one job, so it stands alone in the card.
  const [codeStep, setCodeStep] = useState(false);
  // Better Auth's documented read, taken after hydration: the server has no
  // `document`, so rendering the mark there and here would disagree
  // (claude-docs/components/sign-in-panel.md, "Contracts").
  const lastUsed = useSyncExternalStore(noSubscription, getLastUsedProvider, () => null);
  const lastUsedPassword = useSyncExternalStore(noSubscription, getLastUsedPassword, () => false);
  const passkeyLastUsed = useSyncExternalStore(noSubscription, getLastUsedPasskey, () => false);

  // The provider whose hop is under way. The page is left for the provider's own, so on
  // success it stays set until the browser goes; a return from the back-forward cache (the
  // page restored as it was left) clears it.
  const searchParams = useSearchParams();
  // In a dialog the address is the page's beneath, so the view is held here and Back is the form's own.
  const [dialogEmailView, setDialogEmailView] = useState(false);
  const emailView = inDialog ? dialogEmailView : searchParams.get(EMAIL_VIEW_PARAM) === EMAIL_VIEW;
  // Held here, not in the form, so the address survives a trip back to the buttons.
  const [email, setEmail] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const emailButton = useRef<HTMLButtonElement>(null);
  const shown = useRef(emailView);
  // On a switch of view, focus moves to the new view's heading, or in a dialog, whose buttons have
  // none, back to Continue with Email; the first render leaves focus alone. A dialog's email view has no
  // heading of its own: the dialog's title is it, and the dialog, told here, focuses that.
  useEffect(() => {
    if (shown.current === emailView) return;
    shown.current = emailView;
    onEmailViewChange?.(emailView);
    (
      panelRef.current?.querySelector<HTMLElement>('[data-view-heading]') ?? emailButton.current
    )?.focus();
  }, [emailView, onEmailViewChange]);

  const showView = (toEmail: boolean): void => {
    if (inDialog) return setDialogEmailView(toEmail);
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
      window.history.replaceState(null, '', url);
    }
  };

  const [signingIn, setSigningIn] = useState<SignInAttempt | null>(null);
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
    // errorCallbackURL carries `next` along, so a failed attempt keeps the destination. A dropped connection throws rather
    // than answering `error`; both say so.
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

  const classes = [
    // Its own card ground, `.panel`, on /sign-in, which holds nothing else; a dialog is its own
    // (claude-docs/components/sign-in-panel.md, "Styling").
    inDialog ? 'sign-in-panel' : 'panel sign-in-panel',
    codeStep && 'sign-in-panel--code',
  ];
  return (
    <div className={classes.filter(Boolean).join(' ')} ref={panelRef}>
      {message && <Notice kind="error">{message}</Notice>}
      {emailView ? (
        <PasswordForm
          next={next}
          mode={mode}
          onModeChange={switchMode}
          headingLevel={inDialog ? 'h3' : 'h1'}
          ownHeading={!inDialog}
          signUpLandsOnNext={signUpLandsOnNext}
          onSignedUp={onSignedUp}
          lastUsed={lastUsedPassword}
          email={email}
          onEmailChange={setEmail}
          onBack={() => showView(false)}
          onStart={() => setMessage(undefined)}
          onCodeStep={setCodeStep}
        />
      ) : (
        <>
          {!inDialog && (
            <PageHeader
              className="sign-in-panel__header"
              headingClassName="auth-title"
              focusable
              title={SIGN_IN_TITLES[mode]}
              lede={ledes?.[mode]}
            />
          )}
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
            {/* A passkey signs in to an account that has one; it cannot make one. */}
            {!signingUp && (
              <PasskeyButton
                next={next}
                lastUsed={passkeyLastUsed}
                signingIn={signingIn}
                onSigningIn={setSigningIn}
              />
            )}
            <button
              ref={emailButton}
              type="button"
              className="btn btn--solid"
              disabled={signingIn !== null}
              onClick={() => showView(true)}
            >
              Continue with Email
            </button>
          </div>
          <ModeSwitch mode={mode} onSwitch={switchMode} />
        </>
      )}
    </div>
  );
};

export default SignInPanel;
