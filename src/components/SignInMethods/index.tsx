'use client';

import { type ReactElement, useId, useState } from 'react';
import { linkSocial, signOut, unlinkAccount } from '../../lib/auth-client';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import {
  ACCOUNT_PATH,
  GENERIC_LINK_ERROR,
  signInPath,
  unlinkErrorMessage,
} from '../../lib/sign-in';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import type { LinkedAccount, ProviderId } from '../../lib/types';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import { ProviderRow } from './provider-row';
import type { ProviderRemoval, SignInMethodError, SignInMethodsProps } from './types';
import './index.scss';

// The account page's list of the ways into this account: each roster
// provider, linked or addable, removable while another is left. Adding one is
// Better Auth's /link-social, which leaves for the provider and lands back on
// the account page; removing one is /unlink-account, answered in place. A
// session too old for Better Auth to remove one is offered a fresh sign-in
// in place of every Remove, rather than a press it would refuse. The
// section's heading and intro are the page's, so the section is a named
// region like the other two. See claude-docs/components/sign-in-methods.md.

const SignInMethods = ({
  linked,
  configured,
  error,
  fresh = true,
}: SignInMethodsProps): ReactElement => {
  const freshNoteId = useId();
  // Seeded from the server's list; a removal answers in place rather than
  // reloading the page.
  const [accounts, setAccounts] = useState(linked);
  // Seeded from the server-rendered callback error, then replaced by a
  // failure here; a removal's confirmation replaces either.
  const [alert, setAlert] = useState<SignInMethodError | undefined>(error);
  const [removed, setRemoved] = useState<string>();
  const [pending, setPending] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  const handleAdd = async (providerId: ProviderId): Promise<void> => {
    if (!configured.includes(providerId)) return;
    setAlert(undefined);
    setRemoved(undefined);
    const result = await linkSocial({
      provider: providerId,
      callbackURL: ACCOUNT_PATH,
      // The provider rides back on the failure, so the page can put the
      // sentence in this row (claude-docs/components/sign-in-methods.md).
      errorCallbackURL: `${ACCOUNT_PATH}?provider=${providerId}`,
    });
    if (result?.error) setAlert({ providerId, message: GENERIC_LINK_ERROR });
  };

  const handleRemove = async (account: LinkedAccount, label: string): Promise<void> => {
    setAlert(undefined);
    setRemoved(undefined);
    setPending(account.id);
    const result = await unlinkAccount({ accountId: account.id });
    setPending(undefined);
    if (result?.error) {
      // The row survives a refusal, so the sentence goes in it.
      setAlert({
        providerId: account.providerId,
        message: unlinkErrorMessage(result.error.code),
      });
      return;
    }
    setAccounts((current) => current.filter((candidate) => candidate.id !== account.id));
    setRemoved(label);
  };

  // Sign out, then sign in again landing back here, which makes the session
  // fresh. The call and its failure are SignOutButton's: a refusal answers
  // `error` and a dropped connection throws, and either says so.
  const handleSignInAgain = async (): Promise<void> => {
    setSigningOut(true);
    setSignOutFailed(false);
    const { error: failure } = await signOut().catch((thrown: unknown) => ({ error: thrown }));
    if (failure) {
      setSigningOut(false);
      setSignOutFailed(true);
      return;
    }
    window.location.assign(signInPath(ACCOUNT_PATH));
  };

  const removal: ProviderRemoval = accounts.length < 2 ? 'last' : fresh ? 'offered' : 'withheld';
  // A failure with no provider it belongs to stays at the head of the list.
  const listAlert = alert && alert.providerId === undefined ? alert.message : undefined;

  return (
    <div className="sign-in-methods">
      {listAlert && <Notice kind="error">{listAlert}</Notice>}
      {/* At the head of the list, not in a row: the row it was is gone. */}
      {removed && <Notice kind="success">{removed} was removed from your sign-in methods.</Notice>}
      {/* Withheld, not only refused: Better Auth would refuse every Remove
          from this session, so the way to a fresh one is offered instead. */}
      {removal === 'withheld' && (
        <div className="sign-in-methods__fresh">
          <Notice kind="plain" id={freshNoteId}>
            Removing a sign-in method needs a recent sign-in.
          </Notice>
          <BusyButton
            className="btn"
            disabled={signingOut}
            busy={signingOut}
            busyLabel="Signing Out"
            aria-describedby={freshNoteId}
            onClick={() => void handleSignInAgain()}
          >
            Sign In Again
          </BusyButton>
          {signOutFailed && <Notice kind="error">{GENERIC_FAILURE}</Notice>}
        </div>
      )}
      <ul className="sign-in-methods__list">
        {SOCIAL_PROVIDERS.map((provider) => {
          const account = accounts.find((candidate) => candidate.providerId === provider.id);
          return (
            <ProviderRow
              key={provider.id}
              provider={provider}
              state={
                account ? 'linked' : configured.includes(provider.id) ? 'addable' : 'unavailable'
              }
              removal={removal}
              pending={pending !== undefined}
              error={alert?.providerId === provider.id ? alert.message : undefined}
              onAdd={() => void handleAdd(provider.id)}
              onRemove={() => {
                if (account) void handleRemove(account, provider.label);
              }}
            />
          );
        })}
      </ul>
    </div>
  );
};

export default SignInMethods;
