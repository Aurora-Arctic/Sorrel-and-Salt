'use client';

import { type ReactElement, useState } from 'react';
import { linkSocial, unlinkAccount } from '../../lib/auth-client';
import { ACCOUNT_PATH, GENERIC_LINK_ERROR, unlinkErrorMessage } from '../../lib/sign-in';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import type { LinkedAccount, ProviderId } from '../../lib/types';
import type { SignInMethodsProps } from './types';
import './index.scss';

// The account page's list of the ways into this account: each roster
// provider, linked or addable, removable while another is left. Adding one is
// Better Auth's /link-social, which leaves for the provider and lands back on
// the account page; removing one is /unlink-account, answered in place.
// See claude-docs/components/sign-in-methods.md.

const SignInMethods = ({ linked, configured, error }: SignInMethodsProps): ReactElement => {
  // Seeded from the server's list; a removal answers in place rather than
  // reloading the page.
  const [accounts, setAccounts] = useState(linked);
  // Seeded from the server-rendered callback error, then replaced by a
  // failure here; a removal's confirmation replaces either.
  const [alert, setAlert] = useState(error);
  const [removed, setRemoved] = useState<string>();
  const [pending, setPending] = useState<string>();

  const handleAdd = async (providerId: ProviderId): Promise<void> => {
    if (!configured.includes(providerId)) return;
    setAlert(undefined);
    setRemoved(undefined);
    const result = await linkSocial({
      provider: providerId,
      callbackURL: ACCOUNT_PATH,
      errorCallbackURL: ACCOUNT_PATH,
    });
    if (result?.error) setAlert(GENERIC_LINK_ERROR);
  };

  const handleRemove = async (account: LinkedAccount, label: string): Promise<void> => {
    setAlert(undefined);
    setRemoved(undefined);
    setPending(account.id);
    const result = await unlinkAccount({ accountId: account.id });
    setPending(undefined);
    if (result?.error) {
      setAlert(unlinkErrorMessage(result.error.code));
      return;
    }
    setAccounts((current) => current.filter((candidate) => candidate.id !== account.id));
    setRemoved(label);
  };

  // Better Auth refuses the last one too; this only keeps the offer honest.
  const removable = accounts.length > 1;

  return (
    <div className="sign-in-methods">
      <h1 className="sign-in-methods__heading">Sign-In Methods</h1>
      <p className="sign-in-methods__intro">Any of these signs you in to this account.</p>
      {alert && (
        <p className="notice notice--error" role="alert">
          {alert}
        </p>
      )}
      {removed && (
        // `output` carries the status role itself, so no `role` attribute.
        <output className="notice notice--success">{removed} was removed.</output>
      )}
      <ul className="sign-in-methods__list">
        {SOCIAL_PROVIDERS.map((provider) => {
          const account = accounts.find((candidate) => candidate.providerId === provider.id);
          const isAvailable = configured.includes(provider.id);
          const noteId = `sign-in-methods__note-${provider.id}`;
          return (
            <li key={provider.id} className="sign-in-methods__item">
              <span className="sign-in-methods__label">{provider.label}</span>
              {account ? (
                // A linked row is the one without an Add; the last one has no control at all.
                removable && (
                  <button
                    type="button"
                    className="btn"
                    disabled={pending !== undefined}
                    onClick={() => handleRemove(account, provider.label)}
                  >
                    Remove {provider.label}
                  </button>
                )
              ) : (
                <>
                  <button
                    type="button"
                    className="btn"
                    // Not `disabled`, as on /sign-in: it stays in the tab order.
                    aria-disabled={isAvailable ? undefined : true}
                    aria-describedby={isAvailable ? undefined : noteId}
                    onClick={() => handleAdd(provider.id)}
                  >
                    Add {provider.label}
                  </button>
                  {!isAvailable && (
                    <p id={noteId} className="sign-in-methods__note">
                      Not available right now.
                    </p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SignInMethods;
