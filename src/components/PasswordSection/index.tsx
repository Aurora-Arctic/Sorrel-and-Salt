'use client';

import { useMutation } from '@tanstack/react-query';
import { usePendingNavigation } from '../../lib/navigation';
import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { changePassword, requestPasswordReset, useSession } from '../../lib/auth-client';
import { useResultFocus } from '../../lib/use-result-focus';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import { newPasswordRefusal, PASSWORD_CHECK_UNAVAILABLE } from '../../lib/password-refusals';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import PasswordField from '../PasswordField';
import { TOO_MANY_ATTEMPTS } from '../SignInPanel/password-form';
import { GENERIC_RESET_REQUEST_ERROR } from '../ForgotPasswordForm';
import type { PasswordSectionProps } from './types';
import './index.scss';

// The account page's Password section. An account with a password changes it through Better Auth's
// client, which asks for the current one; an account with providers alone sets a first one through
// `setPassword`, as Better Auth's endpoint for that answers only on the server
// (claude-docs/components/password-section.md).

export const WRONG_CURRENT_PASSWORD = "That isn't your current password.";
export const GENERIC_CHANGE_ERROR = "We couldn't change your password. Please try again.";

const SetPasswordDocument = graphql(`
  mutation SetPassword($newPassword: String!) {
    setPassword(newPassword: $newPassword)
  }
`);

interface Failure {
  status?: number;
  code?: string;
  message?: string;
}

interface Refusal {
  alert?: string;
  current?: string;
  chosen?: string;
}

function changeRefusal(failure: Failure): Refusal {
  const chosen = newPasswordRefusal(failure);
  if (chosen) return { chosen };
  if (failure.code === 'INVALID_PASSWORD') return { current: WRONG_CURRENT_PASSWORD };
  if (failure.status === 429) return { alert: TOO_MANY_ATTEMPTS };
  // A 500 is the breached-password check unreachable, which refuses rather than waves through.
  return { alert: failure.status === 500 ? PASSWORD_CHECK_UNAVAILABLE : GENERIC_CHANGE_ERROR };
}

const PasswordSection = ({ hasPassword }: PasswordSectionProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const email = useSession().data?.user.email;
  // Whether the account holds a password: the props' answer until a first one is set here.
  const [held, setHeld] = useState(hasPassword);
  const [current, setCurrent] = useState('');
  const [chosen, setChosen] = useState('');
  const [changing, setChanging] = useState(false);
  const [problem, setProblem] = useState<Refusal>({});
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState<'changed' | 'set' | 'link'>();

  const setFirst = useMutation({
    mutationFn: (newPassword: string) => graphqlRequest(SetPasswordDocument, { newPassword }),
    onSuccess: () => {
      setChosen('');
      setHeld(true);
      setSaved('set');
      settle();
      // The page's own text and Sign-In Methods are server-rendered from the account as it was.
      refresh();
    },
    onError: (failure) => {
      const { field, alert } = readGraphqlFailure(failure, ['newPassword']);
      setProblem({ chosen: field?.message, alert });
      settle();
    },
  });

  const { ref, settle } = useResultFocus<HTMLDivElement>();
  const pending = changing || setFirst.isPending || sending;
  const ready = chosen !== '' && (!held || current !== '') && !pending;

  // The reset link goes to the account's own address and is what proves the owner: this session sets
  // no new password without it.
  const sendResetLink = async (): Promise<void> => {
    if (!email || sending) return;
    setSending(true);
    setProblem({});
    setSaved(undefined);
    const { error } = await requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    }).catch(() => ({ error: {} as { status?: number } }));
    setSending(false);
    if (error) {
      setProblem({ alert: error.status === 429 ? TOO_MANY_ATTEMPTS : GENERIC_RESET_REQUEST_ERROR });
    } else {
      setSaved('link');
    }
    settle();
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    // A disabled submit stops a click, not Enter in a field.
    if (!ready) return;
    setProblem({});
    setSaved(undefined);
    if (!held) {
      setFirst.mutate(chosen);
      return;
    }
    setChanging(true);
    // Better Auth answers `{ error }` for a refusal and throws for a dropped connection. The server signs
    // out every other session whatever the request says; asking for it keeps the request honest.
    const { error } = await changePassword({
      currentPassword: current,
      newPassword: chosen,
      revokeOtherSessions: true,
    }).catch(() => ({ error: {} as Failure }));
    setChanging(false);
    if (error) {
      setProblem(changeRefusal(error));
      settle();
      return;
    }
    setCurrent('');
    setChosen('');
    setSaved('changed');
    settle();
    refresh();
  };

  return (
    <div className="password-section" ref={ref}>
      {problem.alert && (
        <Notice kind="error" result>
          {problem.alert}
        </Notice>
      )}
      {saved === 'changed' && (
        <Notice kind="success" result>
          Your password was changed, and every other device signed in to your account has been
          signed out.
        </Notice>
      )}
      {saved === 'set' && (
        <Notice kind="success" result>
          Your password is set. You can sign in with your email address and this password as well as
          your providers.
        </Notice>
      )}
      {saved === 'link' && (
        <Notice kind="success" result>
          We've sent a link to your email address to choose a new password. The link works once,
          within 15 minutes.
        </Notice>
      )}
      {/* `noValidate`: every refusal is the server's, worded and placed like the rest. */}
      <form className="form" onSubmit={(event) => void submit(event)} noValidate>
        {/* A password manager saves a password against the username in the same form, so the account's
            address rides along, read-only and visually hidden (not `display: none`, which managers skip). A placeholder address is no username. */}
        {email && !email.endsWith('.invalid') && (
          <input
            type="email"
            name="username"
            id="password-section-username"
            autoComplete="username"
            value={email}
            readOnly
            tabIndex={-1}
            aria-hidden
            className="password-section__username"
          />
        )}
        {held && (
          <PasswordField
            label="Current Password"
            name="current-password"
            purpose="current"
            value={current}
            onChange={setCurrent}
            error={problem.current}
            required
          />
        )}
        <PasswordField
          label="New Password"
          name="new-password"
          purpose="new"
          value={chosen}
          onChange={setChosen}
          error={problem.chosen}
          required
        />
        <div className="form__actions">
          <BusyButton
            type="submit"
            className="btn btn--solid"
            disabled={!ready}
            busy={pending}
            busyLabel={held ? 'Changing Password' : 'Setting Password'}
          >
            {held ? 'Change Password' : 'Set Password'}
          </BusyButton>
          {held && email && !email.endsWith('.invalid') && (
            <BusyButton
              type="button"
              className="btn btn--quiet btn--small"
              busy={sending}
              busyLabel="Sending Link"
              disabled={pending}
              onClick={() => void sendResetLink()}
            >
              Forgot Your Password?
            </BusyButton>
          )}
        </div>
      </form>
    </div>
  );
};

export default PasswordSection;
