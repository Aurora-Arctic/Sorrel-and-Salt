'use client';

import { useMutation } from '@tanstack/react-query';
import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { NAME_MAX_LENGTH, NameInput } from '@/modules/identity/validation/name';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import { FormActions, PlainTextField } from '../Field';
import Notice from '../Notice';
import type { NameFormProps } from './types';
import './index.scss';

// Plain controlled input, not react-hook-form: one field, checked with the schema the server runs again (claude-docs/components/name-form.md).

const SetNameDocument = graphql(`
  mutation SetName($name: String!) {
    setName(name: $name) {
      id
      name
    }
  }
`);

const NameForm = ({ name }: NameFormProps): ReactElement => {
  const [saved, setSaved] = useState(name);
  const [value, setValue] = useState(name);
  const [savedMessage, setSavedMessage] = useState(false);
  const [alert, setAlert] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();

  const mutation = useMutation({
    mutationFn: (typed: string) => graphqlRequest(SetNameDocument, { name: typed }),
    onSuccess: ({ setName }) => {
      setSaved(setName.name);
      setValue(setName.name);
      setSavedMessage(true);
    },
    onError: (failure) => {
      const { field, alert: message } = readGraphqlFailure(failure, ['name']);
      setFieldError(field?.message);
      setAlert(message);
    },
  });

  // Outer whitespace is no change: the server trims it, as it would store it.
  const unchanged = value.trim() === saved;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by other means.
    if (unchanged || mutation.isPending) return;
    setSavedMessage(false);
    setAlert(undefined);
    const refused = NameInput.safeParse({ name: value }).error?.issues[0]?.message;
    setFieldError(refused);
    if (refused) return;
    mutation.mutate(value);
  };

  return (
    <div className="name-form">
      {alert && <Notice kind="error">{alert}</Notice>}
      {savedMessage && <Notice kind="success">Your name was saved.</Notice>}
      {/* `noValidate`: every refusal is the shared rule's or the server's, worded and
          placed like the rest, rather than the browser's own bubble. */}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <PlainTextField
          label="Name"
          required
          limit={NAME_MAX_LENGTH}
          autoComplete="name"
          placeholder="Your name"
          value={value}
          onChange={(next) => {
            setValue(next);
            setFieldError(undefined);
          }}
          error={fieldError}
        />
        <FormActions noun="Name" dirty={!unchanged} submitting={mutation.isPending} />
      </form>
    </div>
  );
};

export default NameForm;
