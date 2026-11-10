import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import NameForm from '@/components/NameForm';
import { characterCountText } from '@/components/Field/character-count';
import { NAME_MAX_LENGTH, NameInput } from '@/modules/identity/validation/name';
import type { SetNameMutation, SetNameMutationVariables } from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { renderWithQuery } from '../../support/render-with-query';
import { save, submitForm } from '../../support/interact';

// The account page's Name section. The mutation is answered by MSW in
// the shape /api/graphql answers (tests/support/msw/graphql.ts), so a refusal
// is read through the route's own error mapping (claude-docs/components/name-form.md).

function renderForm(ui: ReactElement) {
  return renderWithQuery(ui);
}

const nameField = () => screen.getByRole('textbox', { name: 'Name' });

function acceptSetName() {
  const calls: SetNameMutationVariables[] = [];
  mockGraphQLMutation<SetNameMutation, SetNameMutationVariables>('SetName', (variables) => {
    calls.push(variables);
    return { setName: { id: 'u1', name: variables.name.trim() } };
  });
  return calls;
}

describe('NameForm', () => {
  it('prefills the field with the account name', () => {
    renderForm(<NameForm name="Ada Fixture" />);

    expect(nameField()).toHaveValue('Ada Fixture');
  });

  // Whether Save is off until there is something to save is FormActions' rule
  // (tests/components/Field/form-actions.test.tsx); what counts as a change is
  // this form's: the server trims the name.
  it('fills the name from the browser’s own details', () => {
    renderForm(<NameForm name="Ada Fixture" />);

    expect(nameField()).toHaveAttribute('autocomplete', 'name');
  });

  it('does not count outer whitespace as a change to the name', () => {
    renderForm(<NameForm name="Ada Fixture" />);

    fireEvent.change(nameField(), { target: { value: ' Ada Fixture ' } });
    expect(save()).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: 'Ada Renamed' } });
    expect(save()).toBeEnabled();
  });

  it('saves the typed name, confirms it, and has nothing to save again', async () => {
    const calls = acceptSetName();
    renderForm(<NameForm name="Ada Fixture" />);

    fireEvent.change(nameField(), { target: { value: ' Ada Renamed ' } });
    submitForm();

    expect(await screen.findByRole('status')).toBeVisible();
    expect(calls).toEqual([{ name: ' Ada Renamed ' }]);
    expect(nameField()).toHaveValue('Ada Renamed');
    expect(save()).toBeDisabled();
  });

  it('puts a refusal on `name` beside the field', async () => {
    mockGraphQLError('SetName', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'Enter a name' }],
    });
    renderForm(<NameForm name="Ada Fixture" />);

    fireEvent.change(nameField(), { target: { value: '   x' } });
    submitForm();

    await waitFor(() => expect(nameField()).toHaveAttribute('aria-invalid', 'true'));
    expect(nameField()).toHaveAccessibleDescription(/\S/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('puts any other refusal in the alert region, in the server’s words', async () => {
    mockGraphQLError('SetName', { code: 'FORBIDDEN', message: 'Confirm your email address first' });
    renderForm(<NameForm name="Ada Fixture" />);

    fireEvent.change(nameField(), { target: { value: 'Ada Renamed' } });
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Confirm your email address first');
  });
  it('marks the name as required', () => {
    renderForm(<NameForm name="Ada Fixture" />);

    expect(nameField()).toHaveAttribute('aria-required', 'true');
  });

  it.each(['', '   '])(
    'refuses a name cleared to %j with the shared rule’s words, on the field, without sending',
    (cleared) => {
      const calls = acceptSetName();
      const refusal = NameInput.safeParse({ name: cleared }).error?.issues[0]?.message;
      expect(refusal).toBeTruthy();
      renderForm(<NameForm name="Ada Fixture" />);

      fireEvent.change(nameField(), { target: { value: cleared } });
      expect(save()).toBeEnabled();
      submitForm();

      expect(nameField()).toHaveAttribute('aria-invalid', 'true');
      expect(nameField()).toHaveAccessibleDescription(expect.stringContaining(refusal!));
      expect(calls).toEqual([]);
    },
  );

  it('counts down to the name’s limit as it nears it', () => {
    renderForm(<NameForm name="Ada Fixture" />);
    const length = NAME_MAX_LENGTH - 5;

    fireEvent.change(nameField(), { target: { value: 'a'.repeat(length) } });

    expect(nameField()).toHaveAccessibleDescription(
      expect.stringContaining(characterCountText(length, NAME_MAX_LENGTH)),
    );
  });
});
