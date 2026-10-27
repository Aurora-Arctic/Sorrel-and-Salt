import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateWorkspaceMutation, CreateWorkspaceMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

const { default: CreateWorkspaceForm } = await import('@/components/CreateWorkspaceForm');
const { NavigationProvider, usePendingNavigation } = await import('@/lib/navigation');

// The create-workspace page's form (M9.16, Story 3). The mutation is answered
// by MSW in the shape /api/graphql answers, so a refusal is read through the
// route's own error mapping; that the service refuses a user without the
// right is tests/modules/coven/services/workspace-creation.test.ts's.

function renderForm(ui: ReactNode = <CreateWorkspaceForm />) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
}

const nameField = () => screen.getByRole('textbox', { name: 'Name' });
const create = () => screen.getByRole('button', { name: /^Creat/ });
const submit = () => fireEvent.submit(create().closest('form') as HTMLFormElement);

/** Answers `CreateWorkspace` as the service would: a slug from the trimmed name. */
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

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
});

describe('CreateWorkspaceForm', () => {
  // Its label says it; a tip restating it went (the owner's call, 2026-10-20).
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

    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith('/coven/fixture-coven-2'));
    expect(calls).toEqual([{ name: 'Fixture Coven' }]);
    // The shell's switcher lists covens from a layout the push does not re-run.
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('stays busy from the press until the new page takes over', async () => {
    acceptCreate();
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });
    const busy = create();
    submit();

    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
    await waitFor(() => expect(push).toHaveBeenCalled());
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

    fireEvent.change(nameField(), { target: { value: 'x'.repeat(81) } });
    submit();

    await waitFor(() => expect(nameField()).toHaveAttribute('aria-invalid', 'true'));
    expect(nameField()).toHaveAccessibleDescription(/\S/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(create()).toBeEnabled();
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
    expect(push).not.toHaveBeenCalled();
  });

  // Leaving with a name typed (M13.14): the page sits in the site's
  // NavigationProvider, as the providers put it.
  describe('guarding a typed name', () => {
    /** A link elsewhere on the page, as the site menu is. */
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

    /** A tab close or reload as the browser raises it: true when something cancelled it. */
    function unload(): boolean {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }

    const link = () => screen.getByRole('button', { name: 'Compendium' });
    const asking = () => screen.queryByRole('dialog', { name: 'Discard Changes?' });

    // The guard's shape (Keep Editing, Discard Changes, a dialog outside the
    // form) is proved once at tests/components/Modal/discard.test.tsx; this is
    // the form's wiring of it.
    it('holds a link and a tab close once a name is typed', () => {
      renderOnPage();
      fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });

      expect(unload()).toBe(true);
      fireEvent.click(link());

      expect(asking()).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it('lands in the new coven without asking', async () => {
      acceptCreate('fixture-coven-2');
      renderOnPage();

      fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });
      submit();

      await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith('/coven/fixture-coven-2'));
      expect(asking()).toBeNull();
    });
  });
});
