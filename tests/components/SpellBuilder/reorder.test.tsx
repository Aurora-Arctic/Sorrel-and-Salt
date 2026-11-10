import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import type {
  SpellIngredientSuggestionsQuery,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';
import { TOUCH_DRAG_DELAY_MS } from '@/lib/sortable';
import {
  dragVertically,
  layOutRows,
  moveByKeyboard,
  press,
  touchDragVertically,
} from '../../support/sortable';
import { renderWithQuery } from '../../support/render-with-query';
import { save, submitForm } from '../../support/interact';

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// That the save moves the rows in place is tests/modules/grimoire/services/spells.test.ts's.

const ID = {
  rosewort: '00000000-0000-4000-8000-000000000001',
  roseLeaf: '00000000-0000-4000-8000-000000000002',
  stepRosewort: '00000000-0000-4000-8000-000000000011',
  stepTestwort: '00000000-0000-4000-8000-000000000012',
  stepStir: '00000000-0000-4000-8000-000000000013',
};

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
    {
      id: ID.stepRosewort,
      name: 'Fixture Rosewort',
      form: 'dried leaf',
      quantity: 3,
      unit: 'g',
      body: null,
      ingredient: { id: ID.rosewort, toxic: false, safetyNotes: null, categories: [], stock: [] },
      variant: {
        id: ID.roseLeaf,
        toxic: false,
        safetyNotes: null,
        categories: [],
        formChoice: null,
      },
    },
    {
      id: ID.stepTestwort,
      name: 'Testwort',
      form: null,
      quantity: null,
      unit: null,
      body: null,
      ingredient: null,
      variant: null,
    },
    {
      id: ID.stepStir,
      name: null,
      form: null,
      quantity: null,
      unit: null,
      body: 'Stir thrice',
      ingredient: null,
      variant: null,
    },
  ],
};

const SENT = {
  rosewort: {
    id: ID.stepRosewort,
    ingredientId: ID.rosewort,
    variantId: ID.roseLeaf,
    quantity: 3,
    unit: 'g',
  },
  testwort: { id: ID.stepTestwort, name: 'Testwort' },
  stir: { id: ID.stepStir, body: 'Stir thrice' },
};

function acceptUpdate() {
  const calls: UpdateSpellMutationVariables[] = [];
  mockGraphQLMutation<UpdateSpellMutation, UpdateSpellMutationVariables>(
    'UpdateSpell',
    (variables) => {
      calls.push(variables);
      return { updateSpell: { ...SPELL, status: 'draft' as const, revision: 5 } };
    },
  );
  return calls;
}

function acceptUpdateEchoingSteps() {
  const calls: UpdateSpellMutationVariables[] = [];
  mockGraphQLMutation<UpdateSpellMutation, UpdateSpellMutationVariables>(
    'UpdateSpell',
    (variables) => {
      calls.push(variables);
      const steps = (variables.input.steps ?? []).flatMap(({ id }) =>
        SPELL.steps.filter((step) => step.id === id),
      );
      return { updateSpell: { ...SPELL, steps, status: 'draft' as const, revision: 5 } };
    },
  );
  return calls;
}

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  offerCategories([]);
  const view = renderWithQuery(<SpellBuilder workspaceId="w1" spell={SPELL} {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
  return view;
}

const steps = () => screen.getByRole('list', { name: 'Steps' });
const order = () =>
  within(steps())
    .getAllByRole('button', { name: /^Move / })
    .map((handle) => handle.getAttribute('aria-label')?.replace(/^Move /, ''));
const handle = (name: string) => screen.getByRole('button', { name: `Move ${name}` });
/** Everything the page's status regions say: dnd-kit's own is one. */
const announced = () =>
  screen
    .getAllByRole('status')
    .map((region) => region.textContent)
    .join(' | ');

const ROSEWORT = 'Fixture Rosewort (Dried Leaf)';

describe('the spell builder’s step order', () => {
  beforeEach(() => layOutRows());
  afterEach(() => vi.restoreAllMocks());

  it('gives every kind of step a handle, named for the step', () => {
    renderBuilder();

    expect(order()).toEqual([ROSEWORT, 'Testwort', 'Stir thrice']);
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);
  });

  it('moves a step by keyboard alone, says each step, and keeps the focus on its handle', async () => {
    renderBuilder();
    expect(order()).toEqual([ROSEWORT, 'Testwort', 'Stir thrice']);

    const moving = handle('Testwort');
    act(() => moving.focus());
    await press(moving, ' ');
    expect(announced()).toContain('Picked up Testwort, at position 2 of 3.');
    await press(moving, 'ArrowUp');
    expect(announced()).toContain('Testwort moved to position 1 of 3.');
    await press(moving, ' ');

    expect(announced()).toContain('Testwort put down at position 1 of 3.');
    expect(order()).toEqual(['Testwort', ROSEWORT, 'Stir thrice']);
    expect(handle('Testwort')).toHaveFocus();
    expect(save()).toBeEnabled();
  });

  it('sends the new order on save, every step by its id', async () => {
    const calls = acceptUpdate();
    renderBuilder();

    await moveByKeyboard(handle('Stir thrice'), 'ArrowUp');
    submitForm();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.steps).toEqual([SENT.rosewort, SENT.stir, SENT.testwort]);
  });

  it('takes a step to either end with Home and End, and no further', async () => {
    renderBuilder();

    await moveByKeyboard(handle(ROSEWORT), 'End', 'ArrowDown');
    expect(order()).toEqual(['Testwort', 'Stir thrice', ROSEWORT]);

    await moveByKeyboard(handle('Stir thrice'), 'Home', 'ArrowUp');
    expect(order()).toEqual(['Stir thrice', 'Testwort', ROSEWORT]);
  });

  it('puts a step back where it was on Escape', async () => {
    renderBuilder();
    const moving = handle('Testwort');
    act(() => moving.focus());

    await press(moving, ' ');
    await press(moving, 'ArrowDown');
    await press(moving, 'Escape');

    expect(announced()).toContain('Move cancelled. Testwort is back at position 2 of 3.');
    expect(order()).toEqual([ROSEWORT, 'Testwort', 'Stir thrice']);
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);
  });

  it('moves a step by dragging its handle', async () => {
    renderBuilder();

    // From the first row's middle to the third's, 60px a row.
    await dragVertically(handle(ROSEWORT), 144);

    expect(order()).toEqual(['Testwort', 'Stir thrice', ROSEWORT]);
    expect(save()).toBeEnabled();
  });

  it('moves a step by touch held for the delay, and not by a quick swipe', async () => {
    renderBuilder();

    // A finger that moves off at once is not a drag.
    await touchDragVertically(handle(ROSEWORT), 144, 0);
    expect(order()).toEqual([ROSEWORT, 'Testwort', 'Stir thrice']);

    await touchDragVertically(handle(ROSEWORT), 144, TOUCH_DRAG_DELAY_MS + 50);
    expect(order()).toEqual(['Testwort', 'Stir thrice', ROSEWORT]);
  });

  it('says a step added and a step removed, with the place', async () => {
    renderBuilder();
    mockGraphQLQuery<SpellIngredientSuggestionsQuery>('SpellIngredientSuggestions', () => ({
      ingredientSuggestions: { edges: [] },
    }));

    const box = screen.getByRole('combobox', { name: 'Add to Jar' });
    act(() => box.focus());
    fireEvent.change(box, { target: { value: 'Fixture Glimmerseed' } });
    fireEvent.click(
      await screen.findByRole('option', {
        name: 'Add "Fixture Glimmerseed" as a one-off ingredient',
      }),
    );
    expect(announced()).toContain('Added Fixture Glimmerseed, at position 4 of 4.');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Testwort' }));
    expect(announced()).toContain('Removed Testwort, from position 2 of 4.');
    expect(order()).toEqual([ROSEWORT, 'Stir thrice', 'Fixture Glimmerseed']);
  });
});

describe('the spell builder’s undo of step changes', () => {
  beforeEach(() => layOutRows());
  afterEach(() => vi.restoreAllMocks());

  const undo = () => fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  const redo = () => fireEvent.click(screen.getByRole('button', { name: 'Redo' }));

  it('undoes and redoes a move as one entry', async () => {
    renderBuilder();
    await moveByKeyboard(handle('Stir thrice'), 'ArrowUp');
    expect(order()).toEqual([ROSEWORT, 'Stir thrice', 'Testwort']);

    undo();
    await waitFor(() => expect(order()).toEqual([ROSEWORT, 'Testwort', 'Stir thrice']));
    redo();
    await waitFor(() => expect(order()).toEqual([ROSEWORT, 'Stir thrice', 'Testwort']));
  });

  it('undoes and redoes the removal of an instruction', async () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Stir thrice' }));
    expect(order()).toEqual([ROSEWORT, 'Testwort']);

    undo();
    await waitFor(() => expect(order()).toEqual([ROSEWORT, 'Testwort', 'Stir thrice']));
    redo();
    await waitFor(() => expect(order()).toEqual([ROSEWORT, 'Testwort']));
  });

  it('undoes and redoes an added instruction', async () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Add Instruction' }));
    await waitFor(() => expect(within(steps()).getAllByRole('listitem')).toHaveLength(4));

    undo();
    await waitFor(() => expect(within(steps()).getAllByRole('listitem')).toHaveLength(3));
    redo();
    await waitFor(() => expect(within(steps()).getAllByRole('listitem')).toHaveLength(4));
  });

  it('undoes a move made after a save, and not the save', async () => {
    const calls = acceptUpdate();
    renderBuilder();
    await moveByKeyboard(handle('Stir thrice'), 'ArrowUp');
    submitForm();
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(order()).toEqual([ROSEWORT, 'Stir thrice', 'Testwort']);
    await moveByKeyboard(handle('Stir thrice'), 'ArrowUp');
    expect(order()).toEqual(['Stir thrice', ROSEWORT, 'Testwort']);

    undo();
    await waitFor(() => expect(order()).toEqual([ROSEWORT, 'Stir thrice', 'Testwort']));
  });
});

describe('the spell builder’s undo across a save', () => {
  beforeEach(() => layOutRows());
  afterEach(() => vi.restoreAllMocks());

  it('still undoes and redoes a step removed before the save, and marks the form changed again', async () => {
    const calls = acceptUpdateEchoingSteps();
    renderBuilder();
    const rows = () => within(steps()).getAllByRole('listitem');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Stir thrice' }));
    await waitFor(() => expect(rows()).toHaveLength(2));
    submitForm();
    await waitFor(() => expect(calls).toHaveLength(1));
    await waitFor(() => expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true));
    const kept = rows().length;

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(rows()).toHaveLength(kept + 1));
    await waitFor(() => expect(save()).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    await waitFor(() => expect(rows()).toHaveLength(kept));
  });
});
