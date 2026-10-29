'use client';

import { useMutation } from '@tanstack/react-query';
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import Notice from '../Notice';
import type { NameFormProps } from './types';
import './index.scss';

// The account page's Name section: the name the site shows, changed through `setName`. A
// plain controlled input rather than react-hook-form, as EmailForm is: one field, and every
// refusal is the server's. See claude-docs/components/name-form.md.

const SetNameDocument = graphql(`
  mutation SetName($name: String!) {
    setName(name: $name) {
      id
      name
    }
  }
`);

const NameForm = ({ name }: NameFormProps): ReactElement => {
  // What the row holds: the props' name until a save answers with another.
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

  const { aria, ...field } = fieldDescription({ id: useId(), error: fieldError });

  // Outer whitespace is no change: the server trims it, as it would store it.
  const unchanged = value.trim() === saved;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by other means.
    if (unchanged || mutation.isPending) return;
    setSavedMessage(false);
    setAlert(undefined);
    setFieldError(undefined);
    mutation.mutate(value);
  };

  return (
    <div className="name-form">
      {alert && <Notice kind="error">{alert}</Notice>}
      {savedMessage && <Notice kind="success">Your name was saved.</Notice>}
      {/* `noValidate`: every refusal is the server's, worded and placed like
          the rest, rather than the browser's own bubble. */}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <FieldShell label="Name" {...field}>
          <input
            id={field.controlId}
            className="input"
            type="text"
            autoComplete="name"
            placeholder="Add your name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            {...aria}
          />
        </FieldShell>
        <div className="form__actions">
          {/* Offered only when there is something to save, and busy, saying so, from the press
                        to the answer. */}
          <BusyButton
            type="submit"
            className="btn btn--solid"
            disabled={unchanged || mutation.isPending}
            busy={mutation.isPending}
            busyLabel="Saving Name"
          >
            Save Name
          </BusyButton>
        </div>
      </form>
    </div>
  );
};

export default NameForm;
