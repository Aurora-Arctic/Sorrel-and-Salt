'use client';

import { useMutation } from '@tanstack/react-query';
import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { NAME_MAX_LENGTH, NameInput } from '@/modules/identity/validation/name';
import { graphqlRequest } from '../../lib/graphql-client';
import { FormActions, PlainTextField } from '../Field';
import { useNameField } from '../Field/use-name-field';
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
  const field = useNameField(saved, NameInput.shape.name);
  const { value, setValue, alert, setAlert, fieldError, changed } = field;
  const [savedMessage, setSavedMessage] = useState(false);

  const mutation = useMutation({
    mutationFn: (typed: string) => graphqlRequest(SetNameDocument, { name: typed }),
    onSuccess: ({ setName }) => {
      setSaved(setName.name);
      setValue(setName.name);
      setSavedMessage(true);
    },
    onError: field.fail,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by other means.
    if (!changed || mutation.isPending) return;
    setSavedMessage(false);
    setAlert(undefined);
    if (field.check()) mutation.mutate(value);
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
          onChange={setValue}
          error={fieldError}
        />
        <FormActions noun="Name" dirty={changed} submitting={mutation.isPending} />
      </form>
    </div>
  );
};

export default NameForm;
