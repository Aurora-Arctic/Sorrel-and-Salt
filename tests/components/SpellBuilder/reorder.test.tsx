import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import type { UpdateSpellMutation, UpdateSpellMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';
import { TOUCH_DRAG_DELAY_MS } from '@/lib/sortable';
import {
  dragVertically,
  layOutRows,
  moveByKeyboard,
  press,
  touchDragVertically,
} from '../../support/sortable';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// The spell builder's step order (M10.16, story 51): each step moved by its
// handle, by keyboard or by pointer, each move said, and the order sent on
// save. That the save moves the rows in place, position and layer_order
// together, is tests/modules/grimoire/services/spells.test.ts's.

const ID = {
  rosewort: '00000000-0000-4000-8000-000000000001',
  roseLeaf: '00000000-0000-4000-8000-000000000002',
  stepRosewort: '00000000-0000-4000-8000-000000000011',
  stepTestwort: '00000000-0000-4000-8000-000000000012',
  stepStir: '00000000-0000-4000-8000-000000000013',
};

/** A saved spell of three steps, one of each kind: linked, one-off and instruction. */
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
      note: null,
      body: null,
      ingredient: { id: ID.rosewort, categories: [], stock: [] },
      variant: { id: ID.roseLeaf, categories: [], formChoice: null },
    },
    {
      id: ID.stepTestwort,
      name: 'Testwort',
      form: null,
      quantity: null,
      unit: null,
      note: null,
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
      note: null,
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
      return { updateSpell: { ...SPELL, revision: 5 } };
    },
  );
  return calls;
}

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  // The builder reads the coven's categories as it opens (M10.14).
  offerCategories([]);
  const view = render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" spell={SPELL} {...props} />
    </QueryClientProvider>,
  );
  // A saved spell opens with its sections shut (M10.12): Open All shows its jar.
  fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
  return view;
}

const steps = () => screen.getByRole('list', { name: 'Steps' });
/** Each row's first words, in the order the list shows them. */
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
const save = () => screen.getByRole('button', { name: /^Sav/ });
const submit = () => fireEvent.submit(save().closest('form') as HTMLFormElement);

const ROSEWORT = 'Fixture Rosewort (Dried Leaf)';

describe('the spell builder’s step order', () => {
  beforeEach(() => layOutRows());
  afterEach(() => vi.restoreAllMocks());

  it('gives every kind of step a handle, named for the step', () => {
    renderBuilder();

    expect(order()).toEqual([ROSEWORT, 'Testwort', 'Stir thrice']);
    expect(save()).toBeDisabled();
  });

  it('moves a step by keyboard alone, says each step, and keeps the focus on its handle', async () => {
    renderBuilder();
    // Present before the move: the list is the one to be reordered.
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
    submit();

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
    expect(save()).toBeDisabled();
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

  it('says a step added and a step removed, with the place', () => {
    renderBuilder();

    fireEvent.change(screen.getByRole('textbox', { name: 'One-Off Name' }), {
      target: { value: 'Fixture Glimmerseed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add One-Off Ingredient' }));
    expect(announced()).toContain('Added Fixture Glimmerseed, at position 4 of 4.');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Testwort' }));
    expect(announced()).toContain('Removed Testwort, from position 2 of 4.');
    expect(order()).toEqual([ROSEWORT, 'Stir thrice', 'Fixture Glimmerseed']);
  });
});
