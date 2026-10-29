import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CupboardEntryForm from '@/components/CupboardEntryForm';
import type {
  CompendiumValues,
  CupboardEntryFormProps,
  CupboardOverrides,
} from '@/components/CupboardEntryForm/types';
import type {
  AnnotateCupboardEntryMutation,
  AnnotateCupboardEntryMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press, typeIn } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The override form of a compendium entry in a coven's cupboard (claude-docs/components/cupboard-entry-form.md): a field is sent only when it changed, and null hands it back to the compendium.
// An emptied list is sent as an empty list, the coven having cleared it on purpose.

const COMPENDIUM: CompendiumValues = {
  name: 'Testwort',
  description: 'A plant the fixtures grow.',
  safetyNotes: null,
  elements: ['water'],
  celestialBodies: ['Moon'],
  zodiacSigns: [],
  colors: ['green'],
};

const NONE: CupboardOverrides = {
  label: null,
  description: null,
  safetyNotes: null,
  elements: null,
  celestialBodies: null,
  zodiacSigns: null,
  colors: null,
};

type Variables = AnnotateCupboardEntryMutationVariables;

function renderForm(overrides: Partial<CupboardOverrides> = {}) {
  const onDone = vi.fn();
  const props: CupboardEntryFormProps = {
    workspaceId: '00000000-0000-4000-8000-000000000001',
    ingredientId: '00000000-0000-4000-8000-000000000002',
    compendium: COMPENDIUM,
    overrides: { ...NONE, ...overrides },
    onDone,
  };
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <CupboardEntryForm {...props} />
    </QueryClientProvider>,
  );
  return onDone;
}

function captureSaves(): Variables[] {
  const calls: Variables[] = [];
  mockGraphQLMutation<AnnotateCupboardEntryMutation, Variables>(
    'AnnotateCupboardEntry',
    (variables) => {
      calls.push(variables);
      return { annotateCupboardEntry: { id: 'fixture' } };
    },
  );
  return calls;
}

const save = () => screen.getByRole('button', { name: 'Save Annotation' });
const label = () => screen.getByRole('textbox', { name: 'Label' });

describe('CupboardEntryForm', () => {
  // A tip only where it says a rule: the
  // label's uniqueness, and that an emptied list says the entry has none.
  it('gives Label and the four lists a tip, and Description and Safety Notes none', () => {
    renderForm();

    const tips = screen
      .getAllByRole('button', { name: /^About / })
      .map((tip) => tip.getAttribute('aria-label'));
    expect(tips).toEqual([
      'About Label',
      'About Elements',
      'About Celestial Bodies',
      'About Zodiac Signs',
      'About Colours',
    ]);
    expect(screen.getByRole('textbox', { name: 'Description' })).not.toHaveAccessibleDescription();
    expect(screen.getByRole('textbox', { name: 'Safety Notes' })).not.toHaveAccessibleDescription();
  });

  it('keeps Save off until something changes', () => {
    renderForm();

    expect(save()).toBeDisabled();
    typeIn(label(), 'Fixture Wort');
    expect(save()).toBeEnabled();
  });

  it('sends only the fields that changed', async () => {
    const calls = captureSaves();
    const onDone = renderForm();

    typeIn(label(), ' Fixture Wort ');
    press(save());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toEqual({ label: 'Fixture Wort' });
    expect(router.refresh).toHaveBeenCalled();
  });

  it('sends null for a field handed back to the Compendium', async () => {
    const calls = captureSaves();
    const onDone = renderForm({ label: 'Fixture Wort', description: 'The coven’s own.' });

    press('Restore Original: Label');
    expect(label()).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: 'Restore Original: Label' }),
    ).not.toBeInTheDocument();
    press(save());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(calls[0]?.input).toEqual({ label: null });
  });

  it('sends an emptied list as an empty list, not as null', async () => {
    const calls = captureSaves();
    const onDone = renderForm();

    // Colours start as the Compendium's single entry; taking it out is the coven clearing them.
    press('Remove green');
    press(save());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(calls[0]?.input).toEqual({ colors: [] });
  });

  it('undoes a removed entry, leaving nothing to save', async () => {
    renderForm();

    press('Remove green');
    expect(save()).toBeEnabled();
    press('Undo');

    await waitFor(() => expect(save()).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Remove green' })).toBeInTheDocument();
  });

  it('makes a list the coven’s own once an entry is added', async () => {
    const calls = captureSaves();
    const onDone = renderForm();

    typeIn(screen.getByLabelText('Colour', { selector: 'input' }), 'indigo');
    press('Add Colour');
    press(save());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(calls[0]?.input).toEqual({ colors: ['green', 'indigo'] });
  });

  it('puts a refused label beside the Label field and keeps the form open', async () => {
    mockGraphQLError('AnnotateCupboardEntry', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['label'], message: 'Another entry in this coven has that label' }],
    });
    const onDone = renderForm();

    typeIn(label(), 'Fixture Wort');
    await act(async () => fireEvent.click(save()));

    await waitFor(() => expect(label()).toBeInvalid());
    expect(label()).toHaveAccessibleDescription(/another entry/i);
    expect(onDone).not.toHaveBeenCalled();
  });
});
