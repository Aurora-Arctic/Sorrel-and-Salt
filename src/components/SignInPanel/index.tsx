'use client';

import { useSearchParams } from 'next/navigation';
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { getLastUsedLoginMethod, signIn } from '../../lib/auth-client';
import { GENERIC_SIGN_IN_ERROR, socialSignInTarget } from '../../lib/sign-in';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import { reportLeaving } from '../../lib/navigation';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import { useRestoredFromCache } from '../../lib/use-restored-from-cache';
import { EMAIL_VIEW, EMAIL_VIEW_PARAM, MODE_PARAM, SIGN_UP_MODE, modeFromParam } from './address';
import ModeSwitch from './mode-switch';
import PasswordForm from './password-form';
import ProviderButton from './provider-button';
import PasskeyButton from './passkey-button';
import type { ProviderId } from '../../lib/types';
import { LastUsedMark, SignInBack, signInHeader } from './header';
import type { SignInAttempt, SignInMode, SignInPanelProps, SignInView } from './types';
import './index.scss';

export { LastUsedMark, SignInBack, signInHeader } from './header';

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

const PUSHED_MARK = 'signInEmailViewPushed';

const addressOf = (params: URLSearchParams): string => {
  const query = params.toString();
  return query ? `?${query}` : window.location.pathname;
};

const SignInPanel = ({
  next,
  error,
  configured,
  mode: initialMode = 'sign-in',
  onModeChange,
  inDialog = false,
  signUpLandsOnNext,
  onSignedUp,
  onHeaderChange,
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
  // On a switch of view, focus moves to the page's heading, or in a dialog, whose title the panel does
  // not hold, to Continue with Email on the way back; the dialog focuses its own title for the email
  // view (`focusTitle`). The first render leaves focus alone.
  useEffect(() => {
    if (shown.current === emailView) return;
    shown.current = emailView;
    (
      panelRef.current?.querySelector<HTMLElement>('[data-view-heading]') ?? emailButton.current
    )?.focus();
  }, [emailView]);

  // Whether this document pushed the email entry: if so, the entry beneath is one this panel still writes the mode to.
  const pushedHere = useRef(false);
  const showView = (toEmail: boolean): void => {
    if (inDialog) return setDialogEmailView(toEmail);
    const params = new URLSearchParams(searchParams.toString());
    if (toEmail) params.set(EMAIL_VIEW_PARAM, EMAIL_VIEW);
    else params.delete(EMAIL_VIEW_PARAM);
    const url = addressOf(params);
    if (toEmail) {
      // The mark lets Back undo this push, and names the mode the entry beneath was written in. Next adds its own state
      // keys; copying them in would make its patched pushState skip the sync.
      pushedHere.current = true;
      window.history.pushState({ [PUSHED_MARK]: mode }, '', url);
    } else if (
      window.history.state?.[PUSHED_MARK] &&
      (pushedHere.current || window.history.state[PUSHED_MARK] === mode)
    ) {
      // After a reload the entry beneath belongs to an earlier document, so only one in this mode is gone back to.
      window.history.back();
    } else {
      window.history.replaceState(null, '', url);
    }
  };

  // On the page the address names the mode beside the view (./address.ts), written in place so a switch is no history
  // entry and the email entry keeps the mark Back undoes. An entry Back or Forward lands on takes the mode held here.
  const addressMode = modeFromParam(searchParams.get(MODE_PARAM));
  useEffect(() => {
    if (inDialog || addressMode === mode) return;
    const params = new URLSearchParams(searchParams.toString());
    if (mode === SIGN_UP_MODE) params.set(MODE_PARAM, SIGN_UP_MODE);
    else params.delete(MODE_PARAM);
    const pushedIn: unknown = window.history.state?.[PUSHED_MARK];
    const marked = pushedIn ? { [PUSHED_MARK]: pushedIn } : null;
    window.history.replaceState(marked, '', addressOf(params));
  }, [inDialog, addressMode, mode, searchParams]);

  // One Back for the page and the dialog, keeping its identity so a dialog holding it is not told again.
  const latestShowView = useRef(showView);
  useEffect(() => {
    latestShowView.current = showView;
  });
  const goBack = useCallback(() => latestShowView.current(false), []);

  const view: SignInView = codeStep ? 'code' : emailView ? 'email' : 'buttons';
  const header = useMemo(
    () => signInHeader({ mode, view, lastUsedPassword, ledes }),
    [mode, view, lastUsedPassword, ledes],
  );
  // A dialog draws the head in its own header (claude-docs/components/sign-in-dialog.md).
  useEffect(() => {
    if (inDialog) onHeaderChange?.(header, goBack);
  }, [inDialog, header, goBack, onHeaderChange]);

  const [signingIn, setSigningIn] = useState<SignInAttempt | null>(null);
  useRestoredFromCache(() => setSigningIn(null));

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
      {!inDialog && (
        <div className="sign-in-panel__head">
          {header.back && <SignInBack label={header.backLabel} onBack={goBack} />}
          <PageHeader
            className="sign-in-panel__header"
            headingClassName="auth-title"
            focusable
            title={header.title}
            suffix={header.lastUsed ? <LastUsedMark /> : undefined}
            lede={header.lede}
          />
        </div>
      )}
      {emailView ? (
        <PasswordForm
          next={next}
          mode={mode}
          onModeChange={switchMode}
          signUpLandsOnNext={signUpLandsOnNext}
          onSignedUp={onSignedUp}
          email={email}
          onEmailChange={setEmail}
          onStart={() => setMessage(undefined)}
          onCodeStep={setCodeStep}
        />
      ) : (
        <>
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
