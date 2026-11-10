import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RenameWorkspaceMutation, RenameWorkspaceMutationVariables } from '@/gql/graphql';
import { COVEN_NAME_LIMIT } from '@/modules/coven/validation/workspace-name';
import { limitMessage } from '@/lib/formats';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { router } from '../../support/next-navigation';
import { renderWithQuery } from '../../support/render-with-query';
import { save, submitForm } from '../../support/interact';

const { default: RenameWorkspaceForm } = await import('@/components/RenameWorkspaceForm');

// The coven page's rename control. MSW answers the mutation in /api/graphql's shape, so a refusal is read through the
// route's own error mapping. Whether Save is off until there is something to save, and its busy label, are FormActions'
// rules (tests/components/Field/form-actions.test.tsx); what counts as a change is this form's.

function renderForm(name = 'Fixture Coven') {
  return renderWithQuery(<RenameWorkspaceForm workspaceId="w1" name={name} />);
}

const nameField = () => screen.getByRole('textbox', { name: 'Name' });
const cancel = () => screen.queryByRole('button', { name: 'Cancel' });

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
  router.push.mockClear();
  router.refresh.mockClear();
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
    submitForm();

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledExactlyOnceWith('/coven/fixture-renamed'),
    );
    expect(calls).toEqual([{ workspaceId: 'w1', name: ' Fixture Renamed ' }]);
    // The shell's switcher lists covens from a layout the router.push does not re-run.
    expect(router.refresh).toHaveBeenCalled();
  });

  it('puts a refusal on `name` beside the field, and goes nowhere', async () => {
    mockGraphQLError('RenameWorkspace', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'Give the coven a name' }],
    });
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'F'.repeat(COVEN_NAME_LIMIT + 1) } });
    submitForm();

    await waitFor(() => expect(nameField()).toHaveAttribute('aria-invalid', 'true'));
    expect(nameField()).toHaveAccessibleDescription(/\S/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('clears a refusal on the name as soon as the person edits it', async () => {
    mockGraphQLError('RenameWorkspace', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'Keep this to 80 characters or fewer' }],
    });
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'x'.repeat(COVEN_NAME_LIMIT + 1) } });
    submitForm();
    await waitFor(() => expect(nameField()).toHaveAttribute('aria-invalid', 'true'));

    fireEvent.change(nameField(), { target: { value: 'Fixture Coven' } });

    expect(nameField()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('refuses a name past the limit on Save with the shared wording, without asking the server', async () => {
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'x'.repeat(COVEN_NAME_LIMIT + 1) } });
    submitForm();

    expect(await screen.findByText(limitMessage(COVEN_NAME_LIMIT))).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('puts any other refusal in the alert region, in the server’s words, and goes nowhere', async () => {
    mockGraphQLError('RenameWorkspace', {
      code: 'FORBIDDEN',
      message: "The demo coven can't be renamed.",
    });
    renderForm();

    fireEvent.change(nameField(), { target: { value: 'Fixture Renamed' } });
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent("The demo coven can't be renamed.");
    expect(router.push).not.toHaveBeenCalled();
  });
});
