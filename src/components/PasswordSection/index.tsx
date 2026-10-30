'use client';

import { useMutation } from '@tanstack/react-query';
import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { changePassword } from '../../lib/auth-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import { newPasswordRefusal, PASSWORD_CHECK_UNAVAILABLE } from '../../lib/password-refusals';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import PasswordField from '../PasswordField';
import { TOO_MANY_ATTEMPTS } from '../SignInPanel/password-form';
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
  // Whether the account holds a password: the props' answer until a first one is set here.
  const [held, setHeld] = useState(hasPassword);
  const [current, setCurrent] = useState('');
  const [chosen, setChosen] = useState('');
  const [changing, setChanging] = useState(false);
  const [problem, setProblem] = useState<Refusal>({});
  const [saved, setSaved] = useState<'changed' | 'set'>();

  const setFirst = useMutation({
    mutationFn: (newPassword: string) => graphqlRequest(SetPasswordDocument, { newPassword }),
    onSuccess: () => {
      setChosen('');
      setHeld(true);
      setSaved('set');
    },
    onError: (failure) => {
      const { field, alert } = readGraphqlFailure(failure, ['newPassword']);
      setProblem({ chosen: field?.message, alert });
    },
  });

  const pending = changing || setFirst.isPending;
  const ready = chosen !== '' && (!held || current !== '') && !pending;

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
      return;
    }
    setCurrent('');
    setChosen('');
    setSaved('changed');
  };

  return (
    <div className="password-section">
      {problem.alert && <Notice kind="error">{problem.alert}</Notice>}
      {saved === 'changed' && (
        <Notice kind="success">
          Your password was changed, and every other device signed in to your account has been
          signed out.
        </Notice>
      )}
      {saved === 'set' && (
        <Notice kind="success">
          Your password is set. You can sign in with your email address and this password as well as
          your providers.
        </Notice>
      )}
      {/* `noValidate`: every refusal is the server's, worded and placed like the rest. */}
      <form className="form" onSubmit={(event) => void submit(event)} noValidate>
        {held && (
          <PasswordField
            label="Current Password"
            purpose="current"
            value={current}
            onChange={setCurrent}
            error={problem.current}
            required
          />
        )}
        <PasswordField
          label="New Password"
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
        </div>
      </form>
    </div>
  );
};

export default PasswordSection;
