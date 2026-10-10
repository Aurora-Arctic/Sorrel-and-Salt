import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import NameForm from '@/components/NameForm';
import type { SetNameMutation, SetNameMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The account page's Name section (MB.88). The mutation is answered by MSW in
// the shape /api/graphql answers (tests/support/msw/graphql.ts), so a refusal
// is read through the route's own error mapping (claude-docs/components/name-form.md).

function renderForm(ui: ReactNode) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
}

const nameField = () => screen.getByRole('textbox', { name: 'Name' });
const save = () => screen.getByRole('button', { name: /^Sav/ });
const submit = () => fireEvent.submit(save().closest('form') as HTMLFormElement);

/** Answers `SetName` with the row renamed as the server would, trimmed. */
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

  it('has nothing to save until the name is changed', () => {
    renderForm(<NameForm name="Ada Fixture" />);

    expect(save()).toBeDisabled();
    expect(save()).toHaveTextContent('Save Name');

    // Outer whitespace is not a change: the server trims it away.
    fireEvent.change(nameField(), { target: { value: ' Ada Fixture ' } });
    expect(save()).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: 'Ada Renamed' } });
    expect(save()).toBeEnabled();
  });

  it('saves the typed name, says so, and has nothing to save again', async () => {
    const calls = acceptSetName();
    renderForm(<NameForm name="Ada Fixture" />);

    fireEvent.change(nameField(), { target: { value: ' Ada Renamed ' } });
    submit();

    expect(await screen.findByRole('status')).toHaveTextContent('Saved your name.');
    expect(calls).toEqual([{ name: ' Ada Renamed ' }]);
    // The saved name is the new baseline, as the server stored it.
    expect(nameField()).toHaveValue('Ada Renamed');
    expect(save()).toBeDisabled();
  });

  it('is busy while the save is in flight', async () => {
    acceptSetName();
    renderForm(<NameForm name="Ada Fixture" />);

    fireEvent.change(nameField(), { target: { value: 'Ada Renamed' } });
    submit();

    const busy = screen.getByRole('button', { name: 'Saving Name' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
    await screen.findByRole('status');
  });

  it('puts a refusal on `name` beside the field', async () => {
    mockGraphQLError('SetName', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'Enter a name' }],
    });
    renderForm(<NameForm name="Ada Fixture" />);

    fireEvent.change(nameField(), { target: { value: '   x' } });
    submit();

    expect(await screen.findByText('Enter a name')).toBeInTheDocument();
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(nameField()).toHaveAccessibleDescription('Enter a name');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('puts any other refusal in the alert region, in the server’s words', async () => {
    mockGraphQLError('SetName', { code: 'FORBIDDEN', message: 'Confirm your email address first' });
    renderForm(<NameForm name="Ada Fixture" />);

    fireEvent.change(nameField(), { target: { value: 'Ada Renamed' } });
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Confirm your email address first');
  });
});
