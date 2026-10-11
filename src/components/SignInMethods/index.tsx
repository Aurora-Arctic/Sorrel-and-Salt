'use client';

import { type ReactElement, useState } from 'react';
import { linkSocial, unlinkAccount } from '../../lib/auth-client';
import { ACCOUNT_PATH, GENERIC_LINK_ERROR, unlinkErrorMessage } from '../../lib/sign-in';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import type { LinkedAccount, ProviderId } from '../../lib/types';
import Notice from '../Notice';
import { ProviderRow } from './provider-row';
import type { SignInMethodError, SignInMethodsProps } from './types';
import './index.scss';

// The account page's list of the ways into this account: each roster
// provider, linked or addable, removable while another is left. Adding one is
// Better Auth's /link-social, which leaves for the provider and lands back on
// the account page; removing one is /unlink-account, answered in place. The
// section's heading and intro are the page's, so the section is a named
// region like the other two. See claude-docs/components/sign-in-methods.md.

const SignInMethods = ({ linked, configured, error }: SignInMethodsProps): ReactElement => {
  // Seeded from the server's list; a removal answers in place rather than
  // reloading the page.
  const [accounts, setAccounts] = useState(linked);
  // Seeded from the server-rendered callback error, then replaced by a
  // failure here; a removal's confirmation replaces either.
  const [alert, setAlert] = useState<SignInMethodError | undefined>(error);
  const [removed, setRemoved] = useState<string>();
  const [pending, setPending] = useState<string>();

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

  const removable = accounts.length > 1;
  // A failure with no provider it belongs to stays at the head of the list.
  const listAlert = alert && alert.providerId === undefined ? alert.message : undefined;

  return (
    <div className="sign-in-methods">
      {listAlert && <Notice kind="error">{listAlert}</Notice>}
      {/* At the head of the list, not in a row: the row it was is gone. */}
      {removed && <Notice kind="success">{removed} was removed.</Notice>}
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
              removable={removable}
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
