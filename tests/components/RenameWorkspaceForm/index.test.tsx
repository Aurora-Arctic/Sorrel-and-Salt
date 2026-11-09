import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RenameWorkspaceMutation, RenameWorkspaceMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

const { default: RenameWorkspaceForm } = await import('@/components/RenameWorkspaceForm');

// The coven page's rename control. MSW answers the mutation in /api/graphql's shape, so a refusal is read through the
// route's own error mapping. Whether Save is off until there is something to save, and its busy label, are FormActions'
// rules (tests/components/Field/form-actions.test.tsx); what counts as a change is this form's.

function renderForm(name = 'Fixture Coven') {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <RenameWorkspaceForm workspaceId="w1" name={name} />
    </QueryClientProvider>,
  );
}

const nameField = () => screen.getByRole('textbox', { name: 'Name' });
const save = () => screen.getByRole('button', { name: /^Sav/ });
const cancel = () => screen.queryByRole('button', { name: 'Cancel' });
const submit = () => fireEvent.submit(save().closest('form') as HTMLFormElement);

function acceptRename(slug = 'fixture-renamed') {
  const calls: RenameWorkspaceMutationVariables[] = [];
  mockGraphQLMutation<RenameWorkspaceMutation, RenameWorkspaceMutationVariables>(
    'RenameWorkspace',
    (variables) => {
      calls.push(variables);
      return {
        renameWorkspace: { id: String(variables.workspaceId), name: variables.name.trim(), slug },
      };
    },
  );
  return calls;
}

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
});

describe('RenameWorkspaceForm', () => {
  it("prefills the field with the coven's name, marked required", () => {
    renderForm();

    expect(nameField()).toHaveValue('Fixture Coven');
    expect(nameField()).toBeRequired();
  });

  it('has nothing to save until the name changes, and again once it is changed back', () => {
    renderForm();
    expect(save()).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: 'Fixture Renamed' } });
    expect(save()).toBeEnabled();

    fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });
    expect(save()).toBeDisabled();
  });

  it('does not count outer whitespace as a change, and has nothing to save for a blank name', () => {
    renderForm();

    fireEvent.change(nameField(), { target: { value: ' Fixture Coven ' } });
    expect(save()).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: '   ' } });
    expect(save()).toBeDisabled();
  });

  it('draws Cancel quiet, and Cancel puts the saved name back', () => {
    renderForm();
    fireEvent.change(nameField(), { target: { value: 'Fixture Renamed' } });

    expect(cancel()).toHaveClass('btn--quiet');
    fireEvent.click(cancel() as HTMLElement);

    expect(nameField()).toHaveValue('Fixture Coven');
    expect(save()).toBeDisabled();
  });

  it("sends the coven's id and the typed name, then goes to the coven's new address and refreshes the switcher", async () => {
    const calls = acceptRename('fixture-renamed');
    renderForm();

    fireEvent.change(nameField(), { target: { value: ' Fixture Renamed ' } });
    submit();

    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith('/coven/fixture-renamed'));
    expect(calls).toEqual([{ workspaceId: 'w1', name: ' Fixture Renamed ' }]);
    // The shell's switcher lists covens from a layout the push does not re-run.
    expect(refresh).toHaveBeenCalled();
  });

  it('puts a refusal on `name` beside the field, and goes nowhere', async () => {
    mockGraphQLError('RenameWorkspace', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'Give the coven a name' }],
    });
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'F'.repeat(81) } });
    submit();

    await waitFor(() => expect(nameField()).toHaveAttribute('aria-invalid', 'true'));
    expect(nameField()).toHaveAccessibleDescription(/\S/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('puts any other refusal in the alert region, in the server’s words, and goes nowhere', async () => {
    mockGraphQLError('RenameWorkspace', {
      code: 'FORBIDDEN',
      message: "The demo coven can't be renamed.",
    });
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'Fixture Renamed' } });
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent("The demo coven can't be renamed.");
    expect(push).not.toHaveBeenCalled();
  });
});
