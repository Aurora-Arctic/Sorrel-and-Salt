import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderWithQuery } from '../../support/render-with-query';
import { router } from '../../support/next-navigation';
import type { CreateWorkspaceMutation, CreateWorkspaceMutationVariables } from '@/gql/graphql';
import { COVEN_NAME_LIMIT } from '@/modules/coven/validation/workspace-name';
import { limitMessage } from '@/lib/formats';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const { default: CreateWorkspaceForm } = await import('@/components/CreateWorkspaceForm');
const { NavigationProvider, usePendingNavigation } = await import('@/lib/navigation');

// MSW answers the mutation in /api/graphql's shape, so a refusal is read through the route's own error mapping.

function renderForm(ui: ReactElement = <CreateWorkspaceForm />) {
  return renderWithQuery(ui);
}

const nameField = () => screen.getByRole('textbox', { name: 'Name' });
const create = () => screen.getByRole('button', { name: /^Creat/ });
const submit = () => fireEvent.submit(create().closest('form') as HTMLFormElement);

function acceptCreate(slug = 'fixture-coven') {
  const calls: CreateWorkspaceMutationVariables[] = [];
  mockGraphQLMutation<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>(
    'CreateWorkspace',
    (variables) => {
      calls.push(variables);
      return { createWorkspace: { id: 'w1', name: variables.name.trim(), slug } };
    },
  );
  return calls;
}

describe('CreateWorkspaceForm', () => {
  it('tidies the name when the field is left, so the person sees what is sent', () => {
    renderForm();

    fireEvent.change(nameField(), { target: { value: '  Fixture    Coven ' } });
    fireEvent.blur(nameField());

    expect(nameField()).toHaveValue('Fixture Coven');
  });

  it('counts a name past the limit without cutting it', () => {
    renderForm();
    const long = 'x'.repeat(83);

    fireEvent.change(nameField(), { target: { value: long } });

    expect(nameField()).toHaveValue(long);
    expect(nameField()).toHaveAccessibleDescription('3 characters over');
  });

  it('gives the name field no tip, and describes it by nothing until it errs', () => {
    renderForm();

    expect(screen.queryByRole('button', { name: 'About Name' })).not.toBeInTheDocument();
    expect(nameField()).not.toHaveAccessibleDescription();
  });

  it('has nothing to create until a name is typed', () => {
    renderForm();

    expect(nameField()).toHaveValue('');
    expect(nameField()).toBeRequired();
    expect(create()).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: '   ' } });
    expect(create()).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });
    expect(create()).toBeEnabled();
  });

  it('creates the workspace and lands in it', async () => {
    const calls = acceptCreate('fixture-coven-2');
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });
    submit();

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/fixture-coven-2'),
    );
    expect(calls).toEqual([{ name: 'Fixture Coven' }]);
    // The shell's switcher lists covens from a layout the push does not re-run.
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it('stays busy from the press until the new page takes over', async () => {
    acceptCreate();
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });
    const busy = create();
    submit();

    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    // Still held: a second press would make a second coven.
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
  });

  it('puts a refusal on `name` beside the field', async () => {
    mockGraphQLError('CreateWorkspace', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'Keep the name to 80 characters' }],
    });
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'x'.repeat(COVEN_NAME_LIMIT + 1) } });
    submit();

    await waitFor(() => expect(nameField()).toHaveAttribute('aria-invalid', 'true'));
    expect(nameField()).toHaveAccessibleDescription(/\S/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(create()).toBeEnabled();
  });

  it('clears a refusal on the name as soon as the person edits it', async () => {
    mockGraphQLError('CreateWorkspace', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'Keep this to 80 characters or fewer' }],
    });
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'x'.repeat(COVEN_NAME_LIMIT + 1) } });
    submit();
    await waitFor(() => expect(nameField()).toHaveAttribute('aria-invalid', 'true'));

    fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });

    expect(nameField()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('refuses a name past the limit on Save with the shared wording, without asking the server', async () => {
    const calls = acceptCreate();
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'x'.repeat(COVEN_NAME_LIMIT + 1) } });
    submit();

    expect(await screen.findByText(limitMessage(COVEN_NAME_LIMIT))).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('puts any other refusal in the alert region, in the server’s words', async () => {
    mockGraphQLError('CreateWorkspace', {
      code: 'FORBIDDEN',
      message: 'Creating a coven needs an invitation',
    });
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Creating a coven needs an invitation',
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  describe('guarding a typed name', () => {
    function Go() {
      const navigation = usePendingNavigation();
      return (
        <button type="button" onClick={() => navigation.navigate('/compendium')}>
          Compendium
        </button>
      );
    }

    function renderOnPage() {
      renderForm(
        <NavigationProvider>
          <CreateWorkspaceForm />
          <Go />
        </NavigationProvider>,
      );
    }

    function unload(): boolean {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }

    const link = () => screen.getByRole('button', { name: 'Compendium' });
    const asking = () => screen.queryByRole('dialog', { name: 'Discard Changes?' });

    // The guard's shape is proved at tests/components/Modal/discard.test.tsx; this is the form's wiring.
    it('holds a link and a tab close once a name is typed', () => {
      renderOnPage();
      fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });

      expect(unload()).toBe(true);
      fireEvent.click(link());

      expect(asking()).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('lands in the new coven without asking', async () => {
      acceptCreate('fixture-coven-2');
      renderOnPage();

      fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });
      submit();

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/fixture-coven-2'),
      );
      expect(asking()).toBeNull();
    });
  });
});
