'use client';

import { useMutation } from '@tanstack/react-query';
import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { limitMessage } from '../../lib/formats';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { COVEN_NAME_LIMIT } from '@/modules/coven/validation/workspace-name';
import { FormActions } from '../Field';
import { PlainTextField } from '../Field/plain-text-field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { covenPath } from '@/lib/coven-path';

// A plain controlled input, not react-hook-form: every refusal is the server's, the creation gate's
// included (claude-docs/components/create-workspace-form.md).

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
  const { navigate, refresh } = usePendingNavigation();
  const [value, setValue] = useState('');
  const [alert, setAlert] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  // Stays busy until the next page replaces this one, so a second press cannot make a second coven.
  const [leaving, setLeaving] = useState(false);

  const mutation = useMutation({
    mutationFn: (name: string) => graphqlRequest(CreateWorkspaceDocument, { name }),
    onSuccess: ({ createWorkspace: { slug } }) => {
      setLeaving(true);
      navigate(covenPath(slug));
      // The shell's switcher lists the viewer's covens from the layout, which
      // a client-side push does not re-run: refresh brings the new one in.
      refresh();
    },
    onError: (failure) => {
      const { field, alert: message } = readGraphqlFailure(failure, ['name']);
      setFieldError(field?.message);
      setAlert(message);
    },
  });

  const busy = mutation.isPending || leaving;
  const empty = value.trim() === '';
  // A typed name, kept from a link, a tab close or a reload. Not while busy: the
  // navigation to the new coven is this form's own, and the render it reads is the
  // one the request left busy.
  const discard = useDiscardGuard(!empty && !busy);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by other means.
    if (empty || busy) return;
    setAlert(undefined);
    if (value.trim().length > COVEN_NAME_LIMIT) {
      setFieldError(limitMessage(COVEN_NAME_LIMIT));
      return;
    }
    setFieldError(undefined);
    mutation.mutate(value);
  };

  return (
    <>
      {alert && <Notice kind="error">{alert}</Notice>}
      {/* `noValidate`: every refusal is the server's, worded and placed like
          the rest, rather than the browser's own bubble. */}
      <form className="form" onSubmit={handleSubmit} noValidate>
        {/* No tip: the label says it. */}
        <PlainTextField
          label="Name"
          required
          autoComplete="off"
          placeholder="Add a name"
          limit={COVEN_NAME_LIMIT}
          value={value}
          onChange={(next) => {
            setValue(next);
            setFieldError(undefined);
          }}
          error={fieldError}
        />
        {/* Offered only when there is something to create, and busy, saying so, from
                    the press to the next page. */}
        <FormActions
          noun="Coven"
          label="Create Coven"
          busyLabel="Creating Coven"
          dirty={!empty}
          submitting={busy}
        />
        {discard.asking && <DiscardQuestion guard={discard} />}
      </form>
    </>
  );
};

export default CreateWorkspaceForm;
