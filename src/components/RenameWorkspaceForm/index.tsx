'use client';

import { useMutation } from '@tanstack/react-query';
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { FieldShell, FormActions, fieldDescription } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';

// A plain controlled input, as CreateWorkspaceForm is: every refusal is the server's (claude-docs/components/rename-workspace-form.md).

const RenameWorkspaceDocument = graphql(`
  mutation RenameWorkspace($workspaceId: ID!, $name: String!) {
    renameWorkspace(workspaceId: $workspaceId, name: $name) {
      id
      name
      slug
    }
  }
`);

interface RenameWorkspaceFormProps {
  workspaceId: string;
  /** The coven's saved name. */
  name: string;
}

const RenameWorkspaceForm = ({ workspaceId, name }: RenameWorkspaceFormProps): ReactElement => {
  const { navigate, refresh } = usePendingNavigation();
  const [value, setValue] = useState(name);
  const [alert, setAlert] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  // Stays busy until the coven's new address has loaded, so a second press cannot rename twice.
  const [leaving, setLeaving] = useState(false);

  const mutation = useMutation({
    mutationFn: (typed: string) =>
      graphqlRequest(RenameWorkspaceDocument, { workspaceId, name: typed }),
    onSuccess: ({ renameWorkspace: { slug } }) => {
      setLeaving(true);
      navigate(`/coven/${slug}`);
      // The shell's switcher lists the viewer's covens from the layout, which a client-side push does not re-run.
      refresh();
    },
    onError: (failure) => {
      const { field, alert: message } = readGraphqlFailure(failure, ['name']);
      setFieldError(field?.message);
      setAlert(message);
    },
  });

  const { aria, ...field } = fieldDescription({ id: useId(), error: fieldError });

  const busy = mutation.isPending || leaving;
  const typed = value.trim();
  // Outer whitespace is no change, and a blank name is none: the service refuses it.
  const dirty = typed !== '' && typed !== name;
  const discard = useDiscardGuard(value !== name && !busy);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by other means.
    if (!dirty || busy) return;
    setAlert(undefined);
    setFieldError(undefined);
    mutation.mutate(value);
  };

  const cancel = (): void => {
    setValue(name);
    setAlert(undefined);
    setFieldError(undefined);
  };

  return (
    <>
      {alert && <Notice kind="error">{alert}</Notice>}
      <form className="form form--inline-actions" onSubmit={handleSubmit} noValidate>
        <FieldShell label="Name" required {...field}>
          <input
            id={field.controlId}
            className="input"
            type="text"
            autoComplete="off"
            required
            aria-required
            value={value}
            onChange={(event) => setValue(event.target.value)}
            {...aria}
          />
        </FieldShell>
        <FormActions noun="Coven" dirty={dirty} submitting={busy} holdCancel onCancel={cancel} />
        {discard.asking && <DiscardQuestion guard={discard} />}
      </form>
    </>
  );
};

export default RenameWorkspaceForm;
