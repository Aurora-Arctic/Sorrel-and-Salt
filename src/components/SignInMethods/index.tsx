'use client';

import { type ReactElement, useEffect, useId, useState } from 'react';
import { linkSocial, signOut, unlinkAccount } from '../../lib/auth-client';
import { settled } from '../../lib/auth-call';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import {
  ACCOUNT_PASSKEYS_PATH,
  ACCOUNT_PASSWORD_PATH,
  ACCOUNT_SIGN_IN_PATH,
  GENERIC_LINK_ERROR,
  signInPath,
  unlinkErrorMessage,
} from '../../lib/sign-in';
import { reportLeaving } from '../../lib/navigation';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import type { LinkedAccount, ProviderId } from '../../lib/types';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { useAnnounce } from '../ClickFeedback/status-region';
import Notice from '../Notice';
import { ProviderRow } from './provider-row';
import { SectionRow } from './section-row';
import type { ProviderRemoval, SignInMethodError, SignInMethodsProps } from './types';
import './index.scss';

// The account page's list of the ways into this account. A session too old to remove one is offered a fresh sign-in in
// place of every Remove. The heading and intro are the page's (claude-docs/components/sign-in-methods.md).

const SignInMethods = ({
  passwordHeld,
  passkeyCount,
  linked,
  configured,
  error,
  fresh = true,
}: SignInMethodsProps): ReactElement => {
  const freshNoteId = useId();
  // Seeded from the server's list; a removal answers in place rather than
  // reloading the page.
  const [accounts, setAccounts] = useState(linked);
  // The server-rendered callback error, which no press here raised, so a `Notice` rather than a click's callout; any
  // press here clears it (claude-docs/components/click-feedback.md).
  const [alert, setAlert] = useState<SignInMethodError | undefined>(error);
  const [pending, setPending] = useState<string>();
  const announce = useAnnounce();
  const signInAgain = useClickFeedback({ name: 'Sign In Again' });
  // The provider whose link hop is under way: the browser is leaving for it.
  const [linking, setLinking] = useState<ProviderId>();
  const [signingOut, setSigningOut] = useState(false);
  // The page is left for the provider's own, so on success `linking` stays set
  // until the browser goes; a return from the back-forward cache (the page
  // restored as it was left) clears it, as on /sign-in.
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setLinking(undefined);
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);

  const handleAdd = async (providerId: ProviderId): Promise<string | undefined> => {
    if (!configured.includes(providerId)) return undefined;
    setAlert(undefined);
    setLinking(providerId);
    // A dropped connection throws rather than answering `error`; both say so.
    const result = await (async () => {
      try {
        return await linkSocial({
          provider: providerId,
          callbackURL: ACCOUNT_SIGN_IN_PATH,
          // The provider rides back on the failure, so the page can put the
          // sentence in this row (claude-docs/components/sign-in-methods.md).
          errorCallbackURL: `${ACCOUNT_SIGN_IN_PATH}?provider=${providerId}`,
        });
      } catch (thrown) {
        return { error: thrown };
      }
    })();
    if (result?.error) {
      setLinking(undefined);
      return GENERIC_LINK_ERROR;
    }
    // The redirect has started: keep the page bar up until the browser leaves.
    reportLeaving();
    return undefined;
  };

  const handleRemove = async (
    account: LinkedAccount,
    label: string,
  ): Promise<string | undefined> => {
    setAlert(undefined);
    setPending(account.id);
    // A refusal answers `error` with a code; a dropped connection throws, and takes the generic
    // sentence.
    const result = await settled(unlinkAccount({ accountId: account.id }));
    setPending(undefined);
    // The row survives a refusal, so the sentence goes under its Remove.
    if (result?.error) return unlinkErrorMessage(result.error.code);
    setAccounts((current) => current.filter((candidate) => candidate.id !== account.id));
    announce(`${label} was removed from your sign-in methods.`);
    return undefined;
  };

  // Sign out, then sign in again landing back here, which makes the session fresh.
  const handleSignInAgain = async (): Promise<void> => {
    // `aria-disabled` lets a click through, so a second one is refused here.
    if (signingOut) return;
    setSigningOut(true);
    setAlert(undefined);
    signInAgain.report(undefined);
    const { error: failure } = await settled(signOut());
    if (failure) {
      setSigningOut(false);
      signInAgain.report(GENERIC_FAILURE);
      return;
    }
    reportLeaving();
    window.location.assign(signInPath(ACCOUNT_SIGN_IN_PATH));
  };

  const removal: ProviderRemoval = accounts.length < 2 ? 'last' : fresh ? 'offered' : 'withheld';
  const listAlert = alert && alert.providerId === undefined ? alert.message : undefined;

  return (
    <div className="sign-in-methods">
      {listAlert && <Notice kind="error">{listAlert}</Notice>}
      {/* Withheld, not only refused: Better Auth would refuse every Remove
          from this session, so the way to a fresh one is offered instead. */}
      {removal === 'withheld' && (
        <div className="sign-in-methods__fresh">
          <Notice kind="plain" id={freshNoteId}>
            Removing a sign-in method needs a recent sign-in.
          </Notice>
          {/* `aria-disabled` rather than `disabled`, which would drop the
              focus to the page, where a failure's callout could not keep it. */}
          <BusyButton
            ref={signInAgain.anchorRef}
            className="btn"
            aria-disabled={signingOut || undefined}
            busy={signingOut}
            busyLabel="Signing Out"
            aria-describedby={freshNoteId}
            onClick={() => void handleSignInAgain()}
          >
            Sign In Again
          </BusyButton>
          {/* oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering */}
          {signInAgain.feedback}
        </div>
      )}
      <ul className="sign-in-methods__list">
        {SOCIAL_PROVIDERS.map((provider) => {
          const account = accounts.find((candidate) => candidate.providerId === provider.id);
          // A hidden provider is not offered, but a link already made is still listed so it can be removed.
          if (provider.hidden && !account) return null;
          return (
            <ProviderRow
              key={provider.id}
              provider={provider}
              state={
                account ? 'linked' : configured.includes(provider.id) ? 'addable' : 'unavailable'
              }
              removal={removal}
              pending={pending !== undefined}
              busy={account ? pending === account.id : linking === provider.id}
              error={alert?.providerId === provider.id ? alert.message : undefined}
              onAdd={() => handleAdd(provider.id)}
              onRemove={async () => (account ? handleRemove(account, provider.label) : undefined)}
            />
          );
        })}
        <SectionRow
          label="Password"
          status={passwordHeld ? 'Set' : 'Not Set'}
          href={ACCOUNT_PASSWORD_PATH}
          linkLabel={passwordHeld ? 'Manage Password' : 'Set Password'}
        />
        <SectionRow
          label="Passkeys"
          status={
            passkeyCount === 0
              ? 'None Added'
              : `${passkeyCount} ${passkeyCount === 1 ? 'passkey' : 'passkeys'}`
          }
          href={ACCOUNT_PASSKEYS_PATH}
          linkLabel="Manage Passkeys"
        />
      </ul>
    </div>
  );
};

export default SignInMethods;
