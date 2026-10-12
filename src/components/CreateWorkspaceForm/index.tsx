'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import Notice from '../Notice';

// The create-workspace page's form (M9.16): one name, sent to M6.7's
// `createWorkspace`, and on success the new coven's index page. A plain
// controlled input rather than react-hook-form, as NameForm is: one field,
// and every refusal, the creation gate's included, is the server's.
// No wrapper and no stylesheet: the page's `.page-frame__section` is the
// column, so the notice and the form are its children.
// See claude-docs/components/create-workspace-form.md.

const CreateWorkspaceDocument = graphql(`
  mutation CreateWorkspace($name: String!) {
    createWorkspace(name: $name) {
      id
      name
      slug
    }
  }
`);

const CreateWorkspaceForm = (): ReactElement => {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [alert, setAlert] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  // Set once the coven exists and the page is on its way: the button stays
  // busy until the next page replaces this one, so a second press cannot
  // make a second coven.
  const [leaving, setLeaving] = useState(false);

  const mutation = useMutation({
    mutationFn: (name: string) => graphqlRequest(CreateWorkspaceDocument, { name }),
    onSuccess: ({ createWorkspace: { slug } }) => {
      setLeaving(true);
      router.push(`/coven/${slug}`);
    },
    onError: (failure) => {
      const { field, alert: message } = readGraphqlFailure(failure, ['name']);
      setFieldError(field?.message);
      setAlert(message);
    },
  });

  const { aria, ...field } = fieldDescription({
    id: useId(),
    hint: 'What the coven is called. Its address is made from it, and everyone you invite sees it.',
    error: fieldError,
  });

  const busy = mutation.isPending || leaving;
  // A blank name has nothing to create: the service would refuse it.
  const empty = value.trim() === '';

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by other means.
    if (empty || busy) return;
    setAlert(undefined);
    setFieldError(undefined);
    mutation.mutate(value);
  };

  return (
    <>
      {alert && <Notice kind="error">{alert}</Notice>}
      {/* `noValidate`: every refusal is the server's, worded and placed like
          the rest, rather than the browser's own bubble. */}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <FieldShell label="Name" required {...field}>
          <input
            id={field.controlId}
            className="input"
            type="text"
            autoComplete="off"
            placeholder="Add a name"
            required
            aria-required
            value={value}
            onChange={(event) => setValue(event.target.value)}
            {...aria}
          />
        </FieldShell>
        <div className="form__actions">
          {/* Offered only when there is something to create, and busy, saying
              so, from the press to the next page: the owner's rule for every form. */}
          <BusyButton
            type="submit"
            className="btn btn--solid"
            disabled={empty || busy}
            busy={busy}
            busyLabel="Creating Workspace"
          >
            Create Workspace
          </BusyButton>
        </div>
      </form>
    </>
  );
};

export default CreateWorkspaceForm;
