import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import type { CategoryNode } from '../IngredientForm/types';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// The categories a spell is assigned, in the builder (M10.14, story 48): what
// it intends, picked as chips and sent with the save. That the service writes
// exactly the set sent, and refuses a viewer and another coven's member, is
// tests/modules/grimoire/services/spells.test.ts's.

// Invented categories (M1.25), with uuid ids, as the shared schema refuses any other.
const WARDS = { id: 'a3e1c9b2-0d4f-4a8e-9c71-5b2f6e8d0a11', name: 'Wards & Fixtures' };
const colours = { colorDark: '#8fb8de', colorLight: '#2f5d86' };
const CATEGORIES: CategoryNode[] = [
  {
    id: 'c1d3e5f7-2a4b-4c6d-8e9f-0a1b2c3d4e51',
    name: 'Testward',
    description: 'Keeps a fixture from harm.',
    group: { ...WARDS, ...colours },
  },
  {
    id: 'c1d3e5f7-2a4b-4c6d-8e9f-0a1b2c3d4e52',
    name: 'Fixture Shield',
    description: 'Turns a failing test aside.',
    group: { ...WARDS, ...colours },
  },
];
const [TESTWARD, SHIELD] = CATEGORIES;

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  offerCategories(CATEGORIES);
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" {...props} />
    </QueryClientProvider>,
  );
}

const save = () => screen.getByRole('button', { name: /^Sav/ });
const submit = () => fireEvent.submit(save().closest('form') as HTMLFormElement);
const box = () => screen.getByRole('combobox', { name: 'Category' });
const chip = (name: string) => screen.queryByRole('button', { name: `Remove ${name}` });

/** Opens the picker's list, if shut, and picks the category once the categories have been read. */
const pick = async (name: string) => {
  if (box().getAttribute('aria-expanded') !== 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
  // A longer wait than the default, as the ingredient form's tests give it:
  // the options are the only sign the categories have loaded.
  fireEvent.click(
    await screen.findByRole('option', { name: new RegExp(`^${name}`) }, { timeout: 10_000 }),
  );
};

/** The spell as the server answers a save: its fields as sent, at `revision`. */
function answer(id: string, revision: number, input: CreateSpellMutationVariables['input']) {
  return {
    id,
    revision,
    title: input.title ?? null,
    intent: input.intent ?? null,
    jarSize: input.jarSize ?? null,
    sealWaxColor: input.sealWaxColor ?? null,
    moonPhase: input.moonPhase ?? null,
    dayOfWeek: input.dayOfWeek ?? null,
    note: input.note ?? null,
  };
}

function acceptCreate() {
  const calls: CreateSpellMutationVariables[] = [];
  mockGraphQLMutation<CreateSpellMutation, CreateSpellMutationVariables>(
    'CreateSpell',
    (variables) => {
      calls.push(variables);
      return { createSpell: answer('s1', 1, variables.input) };
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
      return {
        updateSpell: answer(
          String(variables.id),
          (variables.input.expectedRevision ?? 0) + 1,
          variables.input,
        ),
      };
    },
  );
  return calls;
}

/** A saved spell the builder opens, filed under `categoryIds`. */
const savedSpell = (categoryIds: string[]): SpellBuilderSpell => ({
  id: 's9',
  revision: 3,
  title: 'Hedge Ward',
  intent: null,
  jarSize: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  note: null,
  categoryIds,
});

describe('the spell builder’s categories', () => {
  it('sends the picked categories with a new spell’s first save', async () => {
    const calls = acceptCreate();
    renderBuilder();

    await pick('Testward');
    await pick('Fixture Shield');
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input.categoryIds).toEqual([TESTWARD.id, SHIELD.id]);
    // What was saved is the new start: the picks stay, and Save goes off.
    await waitFor(() => expect(save()).toBeDisabled());
    expect(chip('Testward')).toBeInTheDocument();
    expect(chip('Fixture Shield')).toBeInTheDocument();
  });

  it('has something to save once a category is picked, and nothing once it is removed', async () => {
    renderBuilder();
    expect(save()).toBeDisabled();

    await pick('Testward');
    expect(save()).toBeEnabled();

    fireEvent.click(chip('Testward') as HTMLElement);
    expect(save()).toBeDisabled();
  });

  it('opens a saved spell with its categories, and sends the set left once one is removed', async () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: savedSpell([TESTWARD.id, SHIELD.id]) });
    await waitFor(() => expect(chip('Testward')).toBeInTheDocument());
    expect(chip('Fixture Shield')).toBeInTheDocument();
    expect(save()).toBeDisabled();

    fireEvent.click(chip('Testward') as HTMLElement);
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ id: 's9', input: { categoryIds: [SHIELD.id] } });
    // Removing the last one sends an empty set, which clears them all.
    await waitFor(() => expect(save()).toBeDisabled());
    fireEvent.click(chip('Fixture Shield') as HTMLElement);
    submit();
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].input.categoryIds).toEqual([]);
  });

  it('leaves the categories out of a save that did not change them', async () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: savedSpell([TESTWARD.id]) });
    await waitFor(() => expect(chip('Testward')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Hedge Ward Renewed' },
    });
    submit();

    // Left out, the service keeps the set as it is.
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input).not.toHaveProperty('categoryIds');
    expect(chip('Testward')).toBeInTheDocument();
  });

  it('puts a refused category beside the field, naming it', async () => {
    mockGraphQLError('CreateSpell', {
      code: 'VALIDATION',
      fieldErrors: [
        {
          path: ['categoryIds', 1],
          message: 'No such category to file it under — choose one from the list',
        },
      ],
    });
    renderBuilder();

    await pick('Testward');
    await pick('Fixture Shield');
    submit();

    await waitFor(() => expect(box()).toBeInvalid());
    expect(box()).toHaveAccessibleDescription(/Fixture Shield/);
    expect(box()).not.toHaveAccessibleDescription(/Testward/);
    // Placed beside its field, so no notice above the form repeats it.
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
