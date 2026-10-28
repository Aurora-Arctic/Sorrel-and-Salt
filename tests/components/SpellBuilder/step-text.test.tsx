import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// The spell builder's step text (M13.3, story 80): an instruction-only step,
// and the instruction beneath an ingredient step. That the service keeps the
// order and the texts is tests/modules/grimoire/services's.

const ID = {
  stepLight: '00000000-0000-4000-8000-000000000021',
  stepCrush: '00000000-0000-4000-8000-000000000022',
};

const savedStep = (
  id: string,
  fields: Partial<NonNullable<SpellBuilderSpell['steps']>[number]>,
): NonNullable<SpellBuilderSpell['steps']>[number] => ({
  id,
  name: null,
  form: null,
  quantity: null,
  unit: null,
  note: null,
  body: null,
  ingredient: null,
  variant: null,
  ...fields,
});

/** A saved spell of an instruction, then a one-off with its own instruction. */
const SPELL: SpellBuilderSpell = {
  id: 's3',
  revision: 4,
  title: null,
  intent: null,
  jarDescription: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  note: null,
  visibility: 'workspace',
  steps: [
    savedStep(ID.stepLight, { body: 'Light the candle' }),
    savedStep(ID.stepCrush, { name: 'Testwort', body: 'Crush it first' }),
  ],
};

function acceptCreate() {
  const calls: CreateSpellMutationVariables[] = [];
  mockGraphQLMutation<CreateSpellMutation, CreateSpellMutationVariables>(
    'CreateSpell',
    (variables) => {
      calls.push(variables);
      return { createSpell: { ...SPELL, id: 's1', revision: 1, steps: [] } };
    },
  );
  return calls;
}

function acceptUpdate() {
  const calls: UpdateSpellMutationVariables[] = [];
  mockGraphQLMutation<UpdateSpellMutation, UpdateSpellMutationVariables>(
    'UpdateSpell',
    (variables) => {
      calls.push(variables);
      return { updateSpell: { ...SPELL, revision: 5 } };
    },
  );
  return calls;
}

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  offerCategories([]);
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" {...props} />
    </QueryClientProvider>,
  );
}

const steps = () => screen.getByRole('list', { name: 'Steps' });
const rows = () => within(steps()).queryAllByRole('listitem');
const instructions = () =>
  within(steps()).queryAllByRole('textbox', { name: /^Instruction/ }) as HTMLTextAreaElement[];
const save = () => screen.getByRole('button', { name: /^Sav/ });
const submit = () => fireEvent.submit(save().closest('form') as HTMLFormElement);
const announced = () =>
  screen
    .getAllByRole('status')
    .map((region) => region.textContent)
    .join(' | ');
const addStep = () => fireEvent.click(screen.getByRole('button', { name: 'Add a Step' }));
const addOneOff = (name: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'One-Off Name' }), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add One-Off Ingredient' }));
};

describe('the spell builder’s step text', () => {
  it('adds an instruction-only step with its field focused, and says so', () => {
    renderBuilder();
    expect(rows()).toHaveLength(0);

    addStep();

    expect(rows()).toHaveLength(1);
    expect(instructions()).toHaveLength(1);
    expect(instructions()[0]).toHaveFocus();
    expect(announced()).toContain('at position 1 of 1.');
    // An instruction-only step has no amount to give.
    expect(within(rows()[0] as HTMLElement).queryByRole('spinbutton')).toBeNull();
  });

  it('sends an instruction-only step as its text alone, in order with the others', async () => {
    const calls = acceptCreate();
    renderBuilder();

    addStep();
    fireEvent.change(instructions()[0] as HTMLElement, { target: { value: 'Light the candle' } });
    addOneOff('Testwort');
    fireEvent.change(instructions()[1] as HTMLElement, { target: { value: 'Crush it first' } });
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.steps).toEqual([
      { body: 'Light the candle' },
      { name: 'Testwort', body: 'Crush it first' },
    ]);
  });

  it('refuses a blank instruction on an instruction-only step at its own field, before it sends', async () => {
    const calls = acceptCreate();
    renderBuilder();
    addStep();
    // Something else to save, so Save is not held for having nothing.
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Fixture Working' },
    });

    submit();

    const field = await screen.findByRole('textbox', { name: /^Instruction/ });
    await waitFor(() => expect(field).toHaveAccessibleDescription(/Write the instruction/));
    expect(field).toBeInvalid();
    expect(calls).toHaveLength(0);
  });

  it('reads a saved spell’s texts back into their fields, an ingredient step’s beneath it', () => {
    renderBuilder({ spell: SPELL });

    expect(instructions().map((field) => field.value)).toEqual([
      'Light the candle',
      'Crush it first',
    ]);
    expect(within(rows()[1] as HTMLElement).getByRole('spinbutton')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('saves an edited text on a saved step by its id, and leaves the other alone', async () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: SPELL });

    fireEvent.change(instructions()[0] as HTMLElement, { target: { value: 'Snuff the candle' } });
    expect(save()).toBeEnabled();
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.steps).toEqual([
      { id: ID.stepLight, body: 'Snuff the candle' },
      { id: ID.stepCrush, name: 'Testwort', body: 'Crush it first' },
    ]);
  });

  it('drops a cleared instruction from an ingredient step, which needs none', async () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: SPELL });

    fireEvent.change(instructions()[1] as HTMLElement, { target: { value: '' } });
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.steps?.[1]).toEqual({ id: ID.stepCrush, name: 'Testwort' });
  });

  it('removes an instruction-only step, says so, and leaves it out of what is sent', async () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: SPELL });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Light the candle' }));

    expect(announced()).toContain('Removed Light the candle, from position 1 of 2.');
    expect(rows()).toHaveLength(1);
    submit();
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.steps).toEqual([
      { id: ID.stepCrush, name: 'Testwort', body: 'Crush it first' },
    ]);
  });

  it('keeps the focus in the list after a removal', () => {
    renderBuilder({ spell: SPELL });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Light the candle' }));

    expect(steps().contains(document.activeElement)).toBe(true);
  });
});
